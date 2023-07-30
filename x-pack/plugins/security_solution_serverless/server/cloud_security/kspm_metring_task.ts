/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageRecord } from '../types';
import {
  KSPM_POLICY_TEMPLATE,
  LATEST_FINDINGS_INDEX_PATTERN,
  LATEST_FINDINGS_RETENTION_POLICY,
} from '@kbn/cloud-security-posture-plugin/common/constants';

import {
  AGGREGATION_PRECISION_THRESHOLD,
  CLOUD_SECURITY_TASK_TYPE,
} from './cloud_security_metring';
import { cloudSecurityMetringTaskProperties } from './metering_tasks_configs';
import type { CloudSecurityMeteringCallbackInput, ResourceCountAggregation } from './types';

const KSPM_BUCKET_SUB_TYPE_NAME = 'KSPM';

export const getKspmUsageRecord = async ({
  esClient,
  projectId,
  logger,
  taskId,
}: CloudSecurityMeteringCallbackInput): Promise<UsageRecord | undefined> => {
  try {
    const response = await esClient.search<unknown, ResourceCountAggregation>(
      getFindingsByResourceAggQuery()
    );

    if (!response.aggregations) {
      return;
    }
    const kspmResourceCount = response.aggregations.unique_resources.value;

    const minTimestamp = response.aggregations
      ? new Date(response.aggregations.min_timestamp.value_as_string).toISOString()
      : new Date().toISOString();

    const usageRecords = {
      id: `${CLOUD_SECURITY_TASK_TYPE}:${KSPM_BUCKET_SUB_TYPE_NAME}`,
      usage_timestamp: minTimestamp,
      creation_timestamp: new Date().toISOString(),
      usage: {
        type: CLOUD_SECURITY_TASK_TYPE,
        sub_type: KSPM_BUCKET_SUB_TYPE_NAME,
        quantity: kspmResourceCount,
        period_seconds: cloudSecurityMetringTaskProperties.periodSeconds,
      },
      source: {
        id: taskId,
        instance_group_id: projectId,
      },
    };

    logger.debug(`Fetched KSPM metring data`);

    return usageRecords;
  } catch (err) {
    logger.error(`Failed to fetch KSPM metering data ${err}`);
  }
};

export const getFindingsByResourceAggQuery = () => ({
  index: LATEST_FINDINGS_INDEX_PATTERN,
  query: {
    bool: {
      must: [
        {
          term: {
            'rule.benchmark.posture_type': KSPM_POLICY_TEMPLATE,
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
