/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { TransformHealthRuleParams } from './schema';
import { ALL_TRANSFORMS_SELECTION } from '../../../../common/constants';
import { getResultTestConfig } from '../../../../common/utils/alerts';

export function transformHealthServiceProvider(esClient: ElasticsearchClient) {
  /**
   * Resolves result transform selection.
   * @param includeTransforms
   * @param excludeTransforms
   */
  const getResultsTransformIds = async (
    includeTransforms: string[],
    excludeTransforms: string[] | null
  ): Promise<string[]> => {
    const includeAll = includeTransforms.some((id) => id === ALL_TRANSFORMS_SELECTION);

    const transformsResponse = (
      await esClient.transform.getTransform({
        ...(includeAll ? {} : { transform_id: includeTransforms.join(',') }),
        allow_no_match: true,
      })
    ).body.transforms;

    let resultTransforms = transformsResponse.map((v) => v.transform_id);

    if (excludeTransforms) {
      const excludeIdsSet = new Set(excludeTransforms);
      resultTransforms = resultTransforms.filter((id) => excludeIdsSet.has(id));
    }

    return resultTransforms;
  };

  return {
    async getNotStartedTransformsReport(transformIds: string[]) {
      const { body } = await esClient.transform.getTransformStats({
        transform_id: transformIds.join(','),
      });
      console.log(body, '___body___');
    },
    async getHealthChecksResults(params: TransformHealthRuleParams) {
      const transformIds = await getResultsTransformIds(
        params.includeTransforms,
        params.excludeTransforms
      );
      const testsConfig = getResultTestConfig(params.testsConfig);
      if (testsConfig.notStarted.enabled) {
        const result = this.getNotStartedTransformsReport(transformIds);
      }
    },
  };
}

export type TransformHealthService = ReturnType<typeof transformHealthServiceProvider>;
