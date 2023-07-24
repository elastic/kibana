/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CloudSecurityMeteringCallbackInput, UsageRecord } from '../types';
import {
  CSPM_POLICY_TEMPLATE,
  CSP_LATEST_FINDINGS_DATA_VIEW,
} from '@kbn/cloud-security-posture-plugin/common/constants';

import { CLOUD_SECURITY_TASK_TYPE } from './cloud_security_metring';
import { cloudSecurityMetringTaskProperties } from './metering_tasks_configs';

// Maximum number of grouped findings, default limit in elasticsearch is set to 65,536 (ref: https://www.elastic.co/guide/en/elasticsearch/reference/current/search-settings.html#search-settings-max-buckets)
const MAX_BUCKETS = 60 * 1000;

const CSPM_CYCLE_SCAN_FREQUENT = '24h';
const CSPM_METRING_TASK_NAME = 'cspm_usage_report';
const CSPM_BUCKET_TYPE_NAME = 'cspm_resource';

export interface Benchmarks {
  benchmarks: {
    buckets: BenchmarkBucket[];
  };
}

interface BenchmarkBucket {
  key: string; // benchmark name
  doc_count: number;
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
    const response = await esClient.search<unknown, Benchmarks>(getFindingsByResourceAggQuery());

    const cspmBenchmarks = response.aggregations?.benchmarks.buckets;

    const { benchmarks, sumResources, earliestTimestampArray } = cspmBenchmarks
      ? cspmBenchmarks.reduce(
          (accumulator, benchmarkBucket: BenchmarkBucket) => {
            accumulator.benchmarks.push(benchmarkBucket.key);
            accumulator.sumResources += benchmarkBucket.unique_resources.value;
            accumulator.earliestTimestampArray.push(benchmarkBucket.min_timestamp);

            return accumulator;
          },
          {
            benchmarks: [] as string[],
            sumResources: 0,
            earliestTimestampArray: [] as MinTimestamp[],
          }
        )
      : { benchmarks: [], sumResources: 0, earliestTimestampArray: undefined };

    const minTimestamp: string =
      earliestTimestampArray && earliestTimestampArray.length > 0
        ? earliestTimestampArray.reduce((min, current) => {
            return current.value < min.value ? current : min;
          }, earliestTimestampArray[0]).value_as_string
        : new Date().toISOString();

    const usageRecords = {
      id: CLOUD_SECURITY_TASK_TYPE + ':' + CSPM_METRING_TASK_NAME,
      usage_timestamp: new Date(minTimestamp).toISOString(),
      creation_timestamp: new Date().toISOString(),
      usage: {
        type: CSPM_BUCKET_TYPE_NAME,
        quantity: sumResources,
        period_seconds: cloudSecurityMetringTaskProperties.periodSeconds,
        cause: benchmarks.join(', '),
      },
      source: {
        id: taskId,
        instance_group_id: projectId,
      },
    };

    logger.debug(`Fetched CSPM metring data`);

    return usageRecords;
  } catch (err) {
    logger.error(`Failed to fetch CSPM metering data ${err}`);
    return;
  }
};

export const getFindingsByResourceAggQuery = () => ({
  index: CSP_LATEST_FINDINGS_DATA_VIEW,
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
              gte: 'now-' + CSPM_CYCLE_SCAN_FREQUENT, // the "look back" period should be the same as the scan interval
            },
          },
        },
      ],
    },
  },
  size: 0,
  aggs: {
    benchmarks: {
      terms: {
        field: 'rule.benchmark.name',
        size: MAX_BUCKETS,
      },
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
    },
  },
});
