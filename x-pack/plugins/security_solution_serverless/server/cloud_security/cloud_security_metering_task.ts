/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageRecord } from '../types';
import {
  LATEST_FINDINGS_INDEX_PATTERN,
  LATEST_FINDINGS_RETENTION_POLICY,
  LATEST_VULNERABILITIES_INDEX_PATTERN,
  LATEST_VULNERABILITIES_RETENTION_POLICY,
} from '@kbn/cloud-security-posture-plugin/common/constants';

import {
  AGGREGATION_PRECISION_THRESHOLD,
  CLOUD_SECURITY_TASK_TYPE,
} from './cloud_security_metring';
import { cloudSecurityMetringTaskProperties } from './metering_tasks_configs';
import type { CloudSecurityMeteringCallbackInput, ResourceCountAggregation } from './types';

export const getCloudSecurityUsageRecord = async ({
  esClient,
  projectId,
  logger,
  taskId,
  postureType,
}: CloudSecurityMeteringCallbackInput): Promise<UsageRecord | undefined> => {
  try {
    if (!postureType) {
      logger.error('posture type is missing');
      return;
    }

    const response = await esClient.search<unknown, ResourceCountAggregation>(
      getAggQueryByPostureType(postureType)
    );

    if (!response.aggregations) {
      return;
    }
    const resourceCount = response.aggregations.unique_resources.value;

    const minTimestamp = response.aggregations
      ? new Date(response.aggregations.min_timestamp.value_as_string).toISOString()
      : new Date().toISOString();

    const usageRecords = {
      id: `${CLOUD_SECURITY_TASK_TYPE}:${postureType}`,
      usage_timestamp: minTimestamp,
      creation_timestamp: new Date().toISOString(),
      usage: {
        type: CLOUD_SECURITY_TASK_TYPE,
        sub_type: postureType,
        quantity: resourceCount,
        period_seconds: cloudSecurityMetringTaskProperties.periodSeconds,
      },
      source: {
        id: taskId,
        instance_group_id: projectId,
      },
    };

    logger.debug(`Fetched ${postureType} metring data`);

    return usageRecords;
  } catch (err) {
    logger.error(`Failed to fetch ${postureType} metering data ${err}`);
  }
};

export const getAggQueryByPostureType = (postureType: string) => {
  return postureType === 'cspm' || postureType === 'kspm'
    ? getFindingsByResourceAggQuery(postureType)
    : getVulnerabilitiesByResourceAggQuery();
};

export const getFindingsByResourceAggQuery = (postureType: string) => ({
  index: LATEST_FINDINGS_INDEX_PATTERN,
  query: {
    bool: {
      must: [
        {
          term: {
            'rule.benchmark.posture_type': postureType,
          },
        },
        {
          range: {
            '@timestamp': {
              gte: 'now-' + LATEST_FINDINGS_RETENTION_POLICY,
            },
          },
        },
      ],
    },
  },
  size: 0,
  aggs: {
    unique_resources: {
      cardinality: {
        field: 'resource.id',
        precision_threshold: AGGREGATION_PRECISION_THRESHOLD,
      },
    },
    min_timestamp: {
      min: {
        field: '@timestamp',
      },
    },
  },
});

export const getVulnerabilitiesByResourceAggQuery = () => ({
  index: LATEST_VULNERABILITIES_INDEX_PATTERN,
  query: {
    bool: {
      must: [
        {
          range: {
            '@timestamp': {
              gte: 'now-' + LATEST_VULNERABILITIES_RETENTION_POLICY, // the "look back" period should be the same as the scan interval
            },
          },
        },
      ],
    },
  },
  size: 0,
  aggs: {
    unique_resources: {
      cardinality: {
        field: 'resource.id',
        precision_threshold: AGGREGATION_PRECISION_THRESHOLD,
      },
    },
    min_timestamp: {
      min: {
        field: '@timestamp',
      },
    },
  },
});
