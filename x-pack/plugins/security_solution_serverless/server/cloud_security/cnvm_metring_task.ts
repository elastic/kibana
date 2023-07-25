/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CloudSecurityMeteringCallbackInput, UsageRecord } from '../types';
import { LATEST_VULNERABILITIES_INDEX_DEFAULT_NS } from '@kbn/cloud-security-posture-plugin/common/constants';

import { CLOUD_SECURITY_TASK_TYPE } from './cloud_security_metring';
import { cloudSecurityMetringTaskProperties } from './metering_tasks_configs';

const CNVM_RETENTION_POLICY = '72h';
const CNVM_BUCKET_SUB_TYPE_NAME = 'CNVM';

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

export const getCnvmUsageRecord = async ({
  esClient,
  projectId,
  logger,
  taskId,
}: CloudSecurityMeteringCallbackInput): Promise<UsageRecord | undefined> => {
  try {
    const response = await esClient.search<unknown, ResourceCountAggregation>(
      getFindingsByResourceAggQuery()
    );

    const cnvmResourceCount = response.aggregations
      ? response.aggregations.unique_resources.value
      : 0;

    const minTimestamp = response.aggregations
      ? new Date(response.aggregations.min_timestamp.value_as_string).toISOString()
      : new Date().toISOString();

    const usageRecords = {
      id: CLOUD_SECURITY_TASK_TYPE + ':' + CLOUD_SECURITY_TASK_TYPE,
      usage_timestamp: minTimestamp,
      creation_timestamp: new Date().toISOString(),
      usage: {
        type: CLOUD_SECURITY_TASK_TYPE,
        sub_type: CNVM_BUCKET_SUB_TYPE_NAME,
        quantity: cnvmResourceCount,
        period_seconds: cloudSecurityMetringTaskProperties.periodSeconds,
      },
      source: {
        id: taskId,
        instance_group_id: projectId,
      },
    };

    logger.debug(`Fetched CNVM metring data`);

    return usageRecords;
  } catch (err) {
    logger.error(`Failed to fetch CNVM metering data ${err}`);
    return;
  }
};

export const getFindingsByResourceAggQuery = () => ({
  index: LATEST_VULNERABILITIES_INDEX_DEFAULT_NS,
  query: {
    bool: {
      must: [
        {
          range: {
            '@timestamp': {
              gte: 'now-' + CNVM_RETENTION_POLICY, // the "look back" period should be the same as the scan interval
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
        precision_threshold: 3000, // default = 3000  note note that even with a threshold as low as 100, the error remains very low 1-6% even when counting millions of items. https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-metrics-cardinality-aggregation.html#_counts_are_approximate
      },
    },
    min_timestamp: {
      min: {
        field: '@timestamp',
      },
    },
  },
});
