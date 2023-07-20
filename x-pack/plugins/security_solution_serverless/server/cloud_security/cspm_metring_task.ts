/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TASK_TYPE_PREFIX } from '../task_manager/usage_reporting_task';
import { MeteringCallbackInput, UsageRecord } from '../types';
import {
  CSPM_POLICY_TEMPLATE,
  CSP_LATEST_FINDINGS_DATA_VIEW,
} from '@kbn/cloud-security-posture-plugin/common/constants';
import { cspmMetringTaskProperties } from './metering_tasks_configs';

// Maximum number of grouped findings, default limit in elasticsearch is set to 65,536 (ref: https://www.elastic.co/guide/en/elasticsearch/reference/current/search-settings.html#search-settings-max-buckets)
const MAX_BUCKETS = 60 * 1000;

const CSPM_CYCLE_SCAN_FREQUENT = '24h';
const CSPM_METRING_TASK_NAME = 'cspm-usage-report';
const CSPM_BUCKET_TYPE_NAME = 'cspm-resource';

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

export const cspmMetringCallback = async ({
  esClient,
  cloudSetup,
  logger,
  taskId,
}: MeteringCallbackInput): Promise<UsageRecord[]> => {
  try {
    const projectId = cloudSetup?.serverless?.projectId || 'missing project id';
    logger.error('no project id found');

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

    const minTimestamp: string = earliestTimestampArray
      ? earliestTimestampArray.reduce((min, current) => {
          return current.value < min.value ? current : min;
        }, earliestTimestampArray[0]).value_as_string
      : new Date().toLocaleString();

    const usageRecords = {
      id: TASK_TYPE_PREFIX + ':' + CSPM_METRING_TASK_NAME,
      usage_timestamp: minTimestamp,
      creation_timestamp: new Date().toLocaleString(),
      usage: {
        type: CSPM_BUCKET_TYPE_NAME,
        quantity: sumResources,
        period_seconds: cspmMetringTaskProperties.periodSeconds,
        cause: benchmarks.join(', '),
      },
      source: {
        id: taskId,
        instance_group_id: projectId,
      },
    };

    logger.debug(`Fetched CSPM metring data`);

    return [usageRecords];
  } catch (err) {
    logger.error(`Failed to fetch CSPM metering data ${err}`);
    return [];
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
