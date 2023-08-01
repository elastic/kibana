/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  TransformGetTransformResponse,
  TransformGetTransformTransformSummary,
} from '@elastic/elasticsearch/lib/api/types';
import { RiskScoreEntity } from '../../../../common/search_strategy';
import {
  getRiskScorePivotTransformId,
  getRiskScoreLatestTransformId,
} from '../../../../common/utils/risk_score_modules';

export const getLegacyTransforms = async ({
  namespace,
  esClient,
}: {
  namespace: string;
  esClient: ElasticsearchClient;
}) => {
  const getTransformStatsRequests: Array<Promise<TransformGetTransformResponse>> = [];
  [RiskScoreEntity.host, RiskScoreEntity.user].forEach((entity) => {
    getTransformStatsRequests.push(
      esClient.transform.getTransform({
        transform_id: getRiskScorePivotTransformId(entity, namespace),
      })
    );
    getTransformStatsRequests.push(
      esClient.transform.getTransform({
        transform_id: getRiskScoreLatestTransformId(entity, namespace),
      })
    );
  });

  const result = await Promise.allSettled(getTransformStatsRequests);

  const fulfuletGetTransformStats = result
    .filter((r) => r.status === 'fulfilled')
    .map((r) => (r as PromiseFulfilledResult<TransformGetTransformResponse>).value);

  const transforms = fulfuletGetTransformStats.reduce((acc, val) => {
    if (val.transforms) {
      return [...acc, ...val.transforms];
    }
    return acc;
  }, [] as TransformGetTransformTransformSummary[]);

  return transforms;
};

export const removeLegacyTransofrms = async ({
  namespace,
  esClient,
}: {
  namespace: string;
  esClient: ElasticsearchClient;
}) => {
  const transforms = await getLegacyTransforms({ namespace, esClient });

  const stopTransformRequests = transforms.map((t) =>
    esClient.transform.deleteTransform({
      transform_id: t.id,
      force: true,
    })
  );

  await Promise.allSettled(stopTransformRequests);
};
