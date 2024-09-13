/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  AGGREGATION_PRECISION_THRESHOLD,
  ASSETS_SAMPLE_GRANULARITY,
  CLOUD_SECURITY_TASK_TYPE,
  CNVM,
  CSPM,
  KSPM,
  METERING_CONFIGS,
  BILLABLE_ASSETS_CONFIG,
} from './constants';
import type { ResourceSubtypeCounter, Tier, UsageRecord } from '../types';
import type {
  CloudSecurityMeteringCallbackInput,
  CloudSecuritySolutions,
  AssetCountAggregation,
  ResourceSubtypeAggregationBucket,
} from './types';

export const getUsageRecords = (
  assetCountAggregation: AssetCountAggregation,
  cloudSecuritySolution: CloudSecuritySolutions,
  taskId: string,
  tier: Tier,
  projectId: string,
  periodSeconds: number,
  logger: Logger
): UsageRecord => {
  let assetCount;
  let resourceSubtypeCounterMap;

  if (cloudSecuritySolution === CSPM || cloudSecuritySolution === KSPM) {
    const resourceSubtypeBuckets: ResourceSubtypeAggregationBucket[] =
      assetCountAggregation.resource_sub_type.buckets;

    const billableAssets = BILLABLE_ASSETS_CONFIG[cloudSecuritySolution].values;
    assetCount = resourceSubtypeBuckets
      .filter((bucket) => billableAssets.includes(bucket.key))
      .reduce((acc, bucket) => acc + bucket.unique_assets.value, 0);

    resourceSubtypeCounterMap = assetCountAggregation.resource_sub_type.buckets.reduce(
      (resourceMap, item) => {
        // By the usage spec, the resource subtype counter should be a string // https://github.com/elastic/usage-api/blob/main/api/user-v1-spec.yml
        resourceMap[item.key] = String(item.unique_assets.value);
        return resourceMap;
      },
      {} as ResourceSubtypeCounter
    );
  } else {
    assetCount = assetCountAggregation.unique_assets.value;
  }

  if (assetCount > AGGREGATION_PRECISION_THRESHOLD) {
    logger.warn(
      `The number of unique resources for {${cloudSecuritySolution}} is ${assetCount}, which is higher than the AGGREGATION_PRECISION_THRESHOLD of ${AGGREGATION_PRECISION_THRESHOLD}.`
    );
  }

  const minTimestamp = new Date(assetCountAggregation.min_timestamp.value_as_string).toISOString();

  const creationTimestamp = new Date();
  const minutes = creationTimestamp.getMinutes();
  if (minutes >= 30) {
    creationTimestamp.setMinutes(30, 0, 0);
  } else {
    creationTimestamp.setMinutes(0, 0, 0);
  }
  const roundedCreationTimestamp = creationTimestamp.toISOString();

  const usageRecord: UsageRecord = {
    id: `${CLOUD_SECURITY_TASK_TYPE}_${cloudSecuritySolution}_${projectId}_${roundedCreationTimestamp}`,
    usage_timestamp: minTimestamp,
    creation_timestamp: creationTimestamp.toISOString(),
    usage: {
      type: CLOUD_SECURITY_TASK_TYPE,
      sub_type: cloudSecuritySolution,
      quantity: assetCount,
      period_seconds: periodSeconds,
      ...(resourceSubtypeCounterMap && { metadata: resourceSubtypeCounterMap }),
    },
    source: {
      id: taskId,
      instance_group_id: projectId,
      metadata: { tier },
    },
  };

  return usageRecord;
};

export const getAggregationByCloudSecuritySolution = (
  cloudSecuritySolution: CloudSecuritySolutions
) => {
  if (cloudSecuritySolution === CSPM || cloudSecuritySolution === KSPM)
    return {
      resource_sub_type: {
        terms: {
          field: BILLABLE_ASSETS_CONFIG[cloudSecuritySolution].filter_attribute,
        },
        aggs: {
          unique_assets: {
            cardinality: {
              field: METERING_CONFIGS[cloudSecuritySolution].assets_identifier,
              precision_threshold: AGGREGATION_PRECISION_THRESHOLD,
            },
          },
        },
      },
      min_timestamp: {
        min: {
          field: '@timestamp',
        },
      },
    };

  return {
    unique_assets: {
      cardinality: {
        field: METERING_CONFIGS[cloudSecuritySolution].assets_identifier,
        precision_threshold: AGGREGATION_PRECISION_THRESHOLD,
      },
    },
    min_timestamp: {
      min: {
        field: '@timestamp',
      },
    },
  };
};

export const getSearchQueryByCloudSecuritySolution = (
  cloudSecuritySolution: CloudSecuritySolutions
) => {
  const mustFilters = [];

  if (
    cloudSecuritySolution === CSPM ||
    cloudSecuritySolution === KSPM ||
    cloudSecuritySolution === CNVM
  ) {
    mustFilters.push({
      range: {
        '@timestamp': {
          gte: `now-${ASSETS_SAMPLE_GRANULARITY}`,
        },
      },
    });
  }

  if (cloudSecuritySolution === CSPM || cloudSecuritySolution === KSPM) {
    mustFilters.push({
      term: {
        'rule.benchmark.posture_type': cloudSecuritySolution,
      },
    });
  }

  return {
    bool: {
      must: mustFilters,
    },
  };
};

export const getAssetAggQueryByCloudSecuritySolution = (
  cloudSecuritySolution: CloudSecuritySolutions
) => {
  const query = getSearchQueryByCloudSecuritySolution(cloudSecuritySolution);
  const aggs = getAggregationByCloudSecuritySolution(cloudSecuritySolution);

  return {
    index: METERING_CONFIGS[cloudSecuritySolution].index,
    query,
    size: 0,
    aggs,
  };
};

export const getAssetAggByCloudSecuritySolution = async (
  esClient: ElasticsearchClient,
  cloudSecuritySolution: CloudSecuritySolutions
): Promise<AssetCountAggregation | undefined> => {
  const assetsAggQuery = getAssetAggQueryByCloudSecuritySolution(cloudSecuritySolution);

  const response = await esClient.search<unknown, AssetCountAggregation>(assetsAggQuery);

  if (!response.aggregations) return;

  return response.aggregations;
};

const indexHasDataInDateRange = async (
  esClient: ElasticsearchClient,
  cloudSecuritySolution: CloudSecuritySolutions
) => {
  const response = await esClient.search(
    {
      index: METERING_CONFIGS[cloudSecuritySolution].index,
      size: 1,
      _source: false,
      query: getSearchQueryByCloudSecuritySolution(cloudSecuritySolution),
    },
    { ignore: [404] }
  );

  return response.hits?.hits.length > 0;
};

export const getCloudSecurityUsageRecord = async ({
  esClient,
  projectId,
  taskId,
  cloudSecuritySolution,
  tier,
  logger,
}: CloudSecurityMeteringCallbackInput): Promise<UsageRecord[] | undefined> => {
  try {
    if (!(await indexHasDataInDateRange(esClient, cloudSecuritySolution))) return;

    // const periodSeconds = Math.floor((new Date().getTime() - searchFrom.getTime()) / 1000);
    const periodSeconds = 1800; // Workaround to prevent overbilling by charging for a constant time window. The issue should be resolved in https://github.com/elastic/security-team/issues/9424.

    const assetCountAggregation = await getAssetAggByCloudSecuritySolution(
      esClient,
      cloudSecuritySolution
    );

    if (!assetCountAggregation) return [];

    const usageRecords = await getUsageRecords(
      assetCountAggregation,
      cloudSecuritySolution,
      taskId,
      tier,
      projectId,
      periodSeconds,
      logger
    );

    return [usageRecords];
  } catch (err) {
    logger.error(`Failed to fetch ${cloudSecuritySolution} metering data ${err}`);
  }
};
