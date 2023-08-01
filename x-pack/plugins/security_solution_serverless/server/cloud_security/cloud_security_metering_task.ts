/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CNVM_POLICY_TEMPLATE,
  CSPM_POLICY_TEMPLATE,
  KSPM_POLICY_TEMPLATE,
  LATEST_FINDINGS_INDEX_PATTERN,
  LATEST_FINDINGS_RETENTION_POLICY,
  LATEST_VULNERABILITIES_INDEX_PATTERN,
  LATEST_VULNERABILITIES_RETENTION_POLICY,
} from '@kbn/cloud-security-posture-plugin/common/constants';
import type { UsageRecord } from '../types';

import {
  AGGREGATION_PRECISION_THRESHOLD,
  CLOUD_SECURITY_TASK_TYPE,
} from './cloud_security_metering';
import { cloudSecurityMetringTaskProperties } from './cloud_security_metering_task_config';
import type {
  CloudSecurityMeteringCallbackInput,
  PostureType,
  ResourceCountAggregation,
} from './types';

const queryParams = {
  [CSPM_POLICY_TEMPLATE]: {
    index: LATEST_FINDINGS_INDEX_PATTERN,
    timeRange: LATEST_FINDINGS_RETENTION_POLICY,
  },
  [KSPM_POLICY_TEMPLATE]: {
    index: LATEST_FINDINGS_INDEX_PATTERN,
    timeRange: LATEST_FINDINGS_RETENTION_POLICY,
  },
  [CNVM_POLICY_TEMPLATE]: {
    index: LATEST_VULNERABILITIES_INDEX_PATTERN,
    timeRange: LATEST_VULNERABILITIES_RETENTION_POLICY,
  },
};

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

export const getAggQueryByPostureType = (postureType: PostureType) => {
  const mustFilters = [];

  mustFilters.push({
    range: {
      '@timestamp': {
        gte: `now-${queryParams[postureType].timeRange}`,
      },
    },
  });

  if (postureType === CSPM_POLICY_TEMPLATE || postureType === KSPM_POLICY_TEMPLATE) {
    mustFilters.push({
      term: {
        'rule.benchmark.posture_type': postureType,
      },
    });
  }

  const query = {
    index: queryParams[postureType].index,
    query: {
      bool: {
        must: mustFilters,
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
  };

  return query;
};
