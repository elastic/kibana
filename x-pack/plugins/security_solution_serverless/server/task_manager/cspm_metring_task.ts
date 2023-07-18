/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TASK_TYPE_PREFIX } from './usage_reporting_task';
import { MeteringCallbackInput, MetringTaskProperties, UsageRecord } from '../types';
import {
  CSPM_POLICY_TEMPLATE,
  CSP_LATEST_FINDINGS_DATA_VIEW,
} from '@kbn/cloud-security-posture-plugin/common/constants';

// Maximum number of grouped findings, default limit in elasticsearch is set to 65,536 (ref: https://www.elastic.co/guide/en/elasticsearch/reference/current/search-settings.html#search-settings-max-buckets)
const MAX_BUCKETS = 60 * 1000;

const CSPM_CYCLE_SCAN_FREQUENT = '24h';

export interface ResourcesStats {
  benchmarks: {
    buckets: BenchmarkBucket[];
  };
}

interface BenchmarkBucket {
  key: string;
  doc_count: number;
  by_resource_id: {
    buckets: ResourceIdBucket[];
  };
  overall_min_timestamp: {
    value: number;
  };
}

interface ResourceIdBucket {
  key: string;
  doc_count: number;

  earliest_timestamp: {
    value: number;
  };
}

export const cspmMetringCallback = async ({
  esClient,
  logger,
  lastSuccessfulReport,
}: MeteringCallbackInput): Promise<UsageRecord[]> => {
  try {
    const response = await esClient.search<unknown, ResourcesStats>(
      getFindingsByResourceAggQuery()
    );

    const cspmBenchmarks = response.aggregations?.benchmarks.buckets;

    // TODO: handle cspmBenchmarks is undefined
    const { sumResources, minTimestamp } = cspmBenchmarks!.reduce(
      (accumulator, benchmarkBucket) => {
        // Calculate the sum of resources
        accumulator.sumResources += benchmarkBucket.by_resource_id.buckets.length;

        // Find the minimum timestamp
        accumulator.minTimestamp = isNaN(accumulator.minTimestamp)
          ? benchmarkBucket.overall_min_timestamp.value
          : Math.min(accumulator.minTimestamp, benchmarkBucket.overall_min_timestamp.value);

        return accumulator;
      },
      { sumResources: 0, minTimestamp: NaN }
    );

    // const sumResources = cspmBenchmarks
    //   ?.map((benchmarkBucket: BenchmarkBucket) => {
    //     return benchmarkBucket.by_resource_id.buckets.length;
    //   })
    //   .reduce((total: number, docCount: number) => total + docCount, 0);

    // const earliestTimestampArray = cspmBenchmarks?.map((benchmarkBucket: BenchmarkBucket) => {
    //   return benchmarkBucket.overall_min_timestamp.value;
    // });

    // const minTimestamp: number = Math.min(...earliestTimestampArray!);

    // TODO: check timezone
    const minTimestampDate: Date = new Date(minTimestamp);

    const usageRecords = {
      id: TASK_TYPE_PREFIX + ':cspm-usage-report',
      usage_timestamp: minTimestampDate.toDateString(),
      creation_timestamp: new Date().toLocaleString(),
      usage: {
        type: 'cspm-resource',
        quantity: sumResources,
        period_seconds: 60 * 60, // equal to task interval
        cause: 'aws benchmark',
      },
      // TODO:
      source: {
        id: 'FOO',
        instance_group_id: '',
      },
    };

    logger.debug(`Fetched CSPM metring data`);
    return [usageRecords];
  } catch (err) {
    logger.error(`Failed to fetch CSPM metering data ${err}`);
    return [];
  }
};

export const cspmMetringTaskProperties: MetringTaskProperties = {
  taskType: TASK_TYPE_PREFIX + ':cspm-usage-reporting-task',
  taskTitle: 'Security Solution - CSPM Metring Periodic Tasks',
  meteringCallback: cspmMetringCallback,
  interval: '3600s',
  version: '1',
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
      },
      aggs: {
        by_resource_id: {
          terms: {
            field: 'resource.id',
            size: MAX_BUCKETS,
          },
          aggs: {
            min_timestamp: {
              min: {
                field: '@timestamp',
              },
            },
          },
        },
        overall_min_timestamp: {
          min_bucket: {
            buckets_path: 'by_resource_id>min_timestamp',
          },
        },
      },
    },
  },
});
