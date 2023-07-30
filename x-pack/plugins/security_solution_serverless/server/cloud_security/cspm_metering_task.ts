/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageRecord } from '../types';
import {
  CSPM_POLICY_TEMPLATE,
  LATEST_FINDINGS_INDEX_PATTERN,
  LATEST_FINDINGS_RETENTION_POLICY,
} from '@kbn/cloud-security-posture-plugin/common/constants';

import {
  AGGREGATION_PRECISION_THRESHOLD,
  CLOUD_SECURITY_TASK_TYPE,
} from './cloud_security_metring';
import { CLOUD_SECURITY_TASK_TYPE } from './cloud_security_metering';
import { cloudSecurityMetringTaskProperties } from './metering_tasks_configs';
import type { CloudSecurityMeteringCallbackInput, ResourceCountAggregation } from './types';

const CSPM_BUCKET_SUB_TYPE_NAME = 'CSPM';

import type { UsageRecord, MeteringCallbackInput } from '../types';

const CSPM_CYCLE_SCAN_FREQUENT = '24h';
const CSPM_BUCKET_SUB_TYPE_NAME = 'CSPM';

interface CloudSecurityMeteringCallbackInput extends Omit<MeteringCallbackInput, 'cloudSetup'> {
  projectId: string;
}

interface ResourceCountAggregation {
  min_timestamp: MinTimestamp;
  unique_resources: {
    value: number;
  };
}

interface MinTimestamp {
  value: number;
  value_as_string: string;
}

export const getCspmUsageRecord = async ({
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
    const cspmResourceCount = response.aggregations.unique_resources.value;

    const minTimestamp = response.aggregations
      ? new Date(response.aggregations.min_timestamp.value_as_string).toISOString()
      : new Date().toISOString();

    const usageRecord = {
      id: `${CLOUD_SECURITY_TASK_TYPE}:${CLOUD_SECURITY_TASK_TYPE}`,
      usage_timestamp: minTimestamp,
      creation_timestamp: new Date().toISOString(),
      usage: {
        type: CLOUD_SECURITY_TASK_TYPE,
        sub_type: CSPM_BUCKET_SUB_TYPE_NAME,
        quantity: cspmResourceCount,
        period_seconds: cloudSecurityMetringTaskProperties.periodSeconds,
      },
      source: {
        id: taskId,
        instance_group_id: projectId,
      },
    };

    logger.debug(`Fetched CSPM metring data`);

    return usageRecord;
  } catch (err) {
    logger.error(`Failed to fetch CSPM metering data ${err}`);
  }
};

export const getFindingsByResourceAggQuery = () => ({
  index: LATEST_FINDINGS_INDEX_PATTERN,
  query: {
    bool: {
      must: [
        {
          term: {
            'rule.benchmark.posture_type': CSPM_POLICY_TEMPLATE,
          },
        },
        {
          range: {
            '@timestamp': {
              gte: 'now-' + LATEST_FINDINGS_RETENTION_POLICY, // the "look back" period should be the same as the scan interval
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
