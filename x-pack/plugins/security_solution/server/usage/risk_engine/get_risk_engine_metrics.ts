/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { RiskEngineMetrics } from './types';

interface GetRiskEngineMetricsOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
  riskEngineIndexPatterns: {
    all: string;
    latest: string;
  };
}

const allEnititiesByTypeAggregationBody = {
  size: 0,
  aggs: {
    user_name: {
      value_count: {
        field: 'user.name',
      },
    },
    host_name: {
      value_count: {
        field: 'host.name',
      },
    },
  },
};

const getEntitiesAggregationData = async ({
  esClient,
  index,
  logger,
  hostMetricField,
  userMetricField,
  lastDay,
}: {
  esClient: ElasticsearchClient;
  index: string;
  logger: Logger;
  hostMetricField: string;
  userMetricField: string;
  lastDay: boolean;
}) => {
  try {
    const bodyRequest: SearchRequest['body'] = {
      ...allEnititiesByTypeAggregationBody,
    };
    if (lastDay) {
      bodyRequest.query = {
        range: {
          '@timestamp': {
            gte: 'now-24h',
            lt: 'now',
          },
        },
      };
    }
    const riskScoreAggsResponse = await esClient.search<
      never,
      {
        user_name: {
          value: number;
        };
        host_name: {
          value: number;
        };
      }
    >({
      index,
      body: bodyRequest,
    });

    return {
      [userMetricField]: riskScoreAggsResponse?.aggregations?.user_name?.value,
      [hostMetricField]: riskScoreAggsResponse?.aggregations?.host_name?.value,
    };
  } catch (err) {
    logger.error(
      `Error while fetching risk score  metrics for ${hostMetricField} and ${userMetricField}: ${err}`
    );
    return {};
  }
};

const getIndexSize = async ({
  esClient,
  index,
  logger,
  metricField,
}: {
  esClient: ElasticsearchClient;
  index: string;
  logger: Logger;
  metricField: string;
}) => {
  try {
    const riskScoreIndexStats = await esClient.indices.stats({
      index,
    });
    const sizeInMb = (riskScoreIndexStats?._all?.primaries?.store?.size_in_bytes ?? 0) / 1e6;
    return {
      [metricField]: sizeInMb,
    };
  } catch (err) {
    logger.error(`Error while fetching risk score  metrics for ${metricField}: ${err}`);
    return {};
  }
};

export const getRiskEngineMetrics = async ({
  esClient,
  logger,
  riskEngineIndexPatterns,
}: GetRiskEngineMetricsOptions): Promise<RiskEngineMetrics> => {
  logger.info('Fetch risk engine metrics');

  try {
    const riskEngineIndexes = await esClient.indices.get({
      index: `${riskEngineIndexPatterns.all}`,
    });

    const isRiskEngineExists = Object.keys(riskEngineIndexes).length > 0;

    if (!isRiskEngineExists) {
      return {};
    }

    const results = await Promise.all([
      getEntitiesAggregationData({
        esClient,
        index: riskEngineIndexPatterns.latest,
        logger,
        lastDay: false,
        hostMetricField: 'unique_host_risk_score_total',
        userMetricField: 'unique_user_risk_score_total',
      }),
      getEntitiesAggregationData({
        esClient,
        index: riskEngineIndexPatterns.latest,
        logger,
        lastDay: true,
        hostMetricField: 'unique_host_risk_score_day',
        userMetricField: 'unique_user_risk_score_day',
      }),
      getEntitiesAggregationData({
        esClient,
        index: riskEngineIndexPatterns.all,
        logger,
        lastDay: false,
        hostMetricField: 'all_host_risk_scores_total',
        userMetricField: 'all_user_risk_scores_total',
      }),
      getEntitiesAggregationData({
        esClient,
        index: riskEngineIndexPatterns.all,
        logger,
        lastDay: true,
        hostMetricField: 'all_host_risk_scores_total_day',
        userMetricField: 'all_user_risk_scores_total_day',
      }),
      getIndexSize({
        esClient,
        logger,
        index: riskEngineIndexPatterns.all,
        metricField: 'all_risk_scores_index_size',
      }),
      getIndexSize({
        esClient,
        logger,
        index: riskEngineIndexPatterns.latest,
        metricField: 'unique_risk_scores_index_size',
      }),
    ]);

    return results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
  } catch (e) {
    logger.error(`Error while fetching risk engine metrics: ${e.message}`);
    return {};
  }
};
