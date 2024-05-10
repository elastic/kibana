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
  CLOUD_DEFEND,
  CLOUD_SECURITY_TASK_TYPE,
  CNVM,
  CSPM,
  KSPM,
  METERING_CONFIGS,
  THRESHOLD_MINUTES,
  BILLABLE_ASSETS_CONFIG,
} from './constants';
import type { Tier, UsageRecord } from '../types';
import type {
  CloudSecurityMeteringCallbackInput,
  CloudSecuritySolutions,
  AssetCountAggregation,
  CloudDefendAssetCountAggregation,
} from './types';

export const getUsageRecords = (
  assetCountAggregations: AssetCountAggregation[],
  cloudSecuritySolution: CloudSecuritySolutions,
  taskId: string,
  tier: Tier,
  projectId: string,
  periodSeconds: number,
  logger: Logger
): UsageRecord[] => {
  const usageRecords = assetCountAggregations.map((assetCountAggregation) => {
    const assetCount = assetCountAggregation.unique_assets.value;

    if (assetCount > AGGREGATION_PRECISION_THRESHOLD) {
      logger.warn(
        `The number of unique resources for {${cloudSecuritySolution}} is ${assetCount}, which is higher than the AGGREGATION_PRECISION_THRESHOLD of ${AGGREGATION_PRECISION_THRESHOLD}.`
      );
    }

    const minTimestamp = new Date(
      assetCountAggregation.min_timestamp.value_as_string
    ).toISOString();

    const creationTimestamp = new Date().toISOString();

    const subType =
      cloudSecuritySolution === CLOUD_DEFEND
        ? `${CLOUD_DEFEND}_block_action_enabled_${assetCountAggregation.key_as_string}`
        : cloudSecuritySolution;

    const usageRecord: UsageRecord = {
      id: `${CLOUD_SECURITY_TASK_TYPE}_${cloudSecuritySolution}_${projectId}_${creationTimestamp}`,
      usage_timestamp: minTimestamp,
      creation_timestamp: creationTimestamp,
      usage: {
        type: CLOUD_SECURITY_TASK_TYPE,
        sub_type: subType,
        quantity: assetCount,
        period_seconds: periodSeconds,
      },
      source: {
        id: taskId,
        instance_group_id: projectId,
        metadata: { tier },
      },
    };

    return usageRecord;
  });
  return usageRecords;
};

export const getAggregationByCloudSecuritySolution = (
  cloudSecuritySolution: CloudSecuritySolutions
) => {
  if (cloudSecuritySolution === CLOUD_DEFEND) {
    return {
      asset_count_groups: {
        terms: {
          field: 'cloud_defend.block_action_enabled',
        },
        aggs: {
          unique_assets: {
            cardinality: {
              field: METERING_CONFIGS[cloudSecuritySolution].assets_identifier,
            },
          },
          min_timestamp: {
            min: {
              field: '@timestamp',
            },
          },
        },
      },
    };
  }

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
  cloudSecuritySolution: CloudSecuritySolutions,
  searchFrom: Date
) => {
  const mustFilters = [];

  if (cloudSecuritySolution === CLOUD_DEFEND) {
    mustFilters.push({
      range: {
        '@timestamp': {
          gt: searchFrom.toISOString(),
        },
      },
    });
  }

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
    const billableAssetsConfig = BILLABLE_ASSETS_CONFIG[cloudSecuritySolution];

    mustFilters.push({
      term: {
        'rule.benchmark.posture_type': cloudSecuritySolution,
      },
    });

    // filter in only billable assets
    mustFilters.push({
      terms: {
        [billableAssetsConfig.filter_attribute]: billableAssetsConfig.values,
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
  cloudSecuritySolution: CloudSecuritySolutions,
  searchFrom: Date
) => {
  const query = getSearchQueryByCloudSecuritySolution(cloudSecuritySolution, searchFrom);
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
  cloudSecuritySolution: CloudSecuritySolutions,
  searchFrom: Date
): Promise<AssetCountAggregation[]> => {
  const assetsAggQuery = getAssetAggQueryByCloudSecuritySolution(cloudSecuritySolution, searchFrom);

  if (cloudSecuritySolution === CLOUD_DEFEND) {
    const response = await esClient.search<unknown, CloudDefendAssetCountAggregation>(
      assetsAggQuery
    );

    if (!response.aggregations || !response.aggregations.asset_count_groups.buckets.length)
      return [];
    return response.aggregations.asset_count_groups.buckets;
  }

  const response = await esClient.search<unknown, AssetCountAggregation>(assetsAggQuery);
  if (!response.aggregations) return [];

  return [response.aggregations];
};

const indexHasDataInDateRange = async (
  esClient: ElasticsearchClient,
  cloudSecuritySolution: CloudSecuritySolutions,
  searchFrom: Date
) => {
  const response = await esClient.search(
    {
      index: METERING_CONFIGS[cloudSecuritySolution].index,
      size: 1,
      _source: false,
      query: getSearchQueryByCloudSecuritySolution(cloudSecuritySolution, searchFrom),
    },
    { ignore: [404] }
  );

  return response.hits?.hits.length > 0;
};

const getSearchStartDate = (lastSuccessfulReport: Date): Date => {
  const initialDate = new Date();
  const thresholdDate = new Date(initialDate.getTime() - THRESHOLD_MINUTES * 60 * 1000);

  if (lastSuccessfulReport) {
    const lastSuccessfulReportDate = new Date(lastSuccessfulReport);

    const searchFrom =
      lastSuccessfulReport && lastSuccessfulReportDate > thresholdDate
        ? lastSuccessfulReportDate
        : thresholdDate;
    return searchFrom;
  }
  return thresholdDate;
};

export const getCloudSecurityUsageRecord = async ({
  esClient,
  projectId,
  taskId,
  lastSuccessfulReport,
  cloudSecuritySolution,
  tier,
  logger,
}: CloudSecurityMeteringCallbackInput): Promise<UsageRecord[] | undefined> => {
  try {
    const searchFrom = getSearchStartDate(lastSuccessfulReport);

    if (!(await indexHasDataInDateRange(esClient, cloudSecuritySolution, searchFrom))) return;

    const periodSeconds = Math.floor((new Date().getTime() - searchFrom.getTime()) / 1000);

    const assetCountAggregations = await getAssetAggByCloudSecuritySolution(
      esClient,
      cloudSecuritySolution,
      searchFrom
    );

    const usageRecords = await getUsageRecords(
      assetCountAggregations,
      cloudSecuritySolution,
      taskId,
      tier,
      projectId,
      periodSeconds,
      logger
    );

    return usageRecords;
  } catch (err) {
    logger.error(`Failed to fetch ${cloudSecuritySolution} metering data ${err}`);
  }
};
