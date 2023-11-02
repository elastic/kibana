/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import {
  createRandomSamplerWrapper,
  type RandomSamplerWrapper,
} from '@kbn/ml-random-sampler-utils';

import { RANDOM_SAMPLER_SEED } from '../../../../common/constants';
import type { AiopsLogRateAnalysisSchema } from '../../../../common/api/log_rate_analysis';
import { createCategoryRequest } from '../../../../common/api/log_categorization/create_category_request';
import type {
  Category,
  CategoriesAgg,
  SparkLinesPerCategory,
} from '../../../../common/api/log_categorization/types';

import { isRequestAbortedError } from '../../../lib/is_request_aborted_error';

import { getQueryWithParams } from './get_query_with_params';

export const getCategoryRequest = (
  params: AiopsLogRateAnalysisSchema,
  fieldName: string,
  from: number | undefined,
  to: number | undefined,
  filter: estypes.QueryDslQueryContainer,
  { wrap }: RandomSamplerWrapper
): estypes.SearchRequest => {
  const { index, timeFieldName } = params;
  const query = getQueryWithParams({
    params,
    termFilters: undefined,
    filter,
  });
  const { params: request } = createCategoryRequest(
    index,
    fieldName,
    timeFieldName,
    from,
    to,
    query,
    wrap
  );

  return request;
};

export interface FetchCategoriesResponse {
  categories: Category[];
  sparkLinesPerCategory: SparkLinesPerCategory;
}

export const fetchCategories = async (
  esClient: ElasticsearchClient,
  params: AiopsLogRateAnalysisSchema,
  fieldNames: string[],
  from: number | undefined,
  to: number | undefined,
  filter: estypes.QueryDslQueryContainer,
  logger: Logger,
  // The default value of 1 means no sampling will be used
  sampleProbability: number = 1,
  emitError: (m: string) => void,
  abortSignal?: AbortSignal
): Promise<FetchCategoriesResponse[]> => {
  const randomSamplerWrapper = createRandomSamplerWrapper({
    probability: sampleProbability,
    seed: RANDOM_SAMPLER_SEED,
  });

  const result: FetchCategoriesResponse[] = [];

  const settledPromises = await Promise.allSettled(
    fieldNames.map((fieldName) => {
      const request = getCategoryRequest(params, fieldName, from, to, filter, randomSamplerWrapper);
      return esClient.search(request, {
        signal: abortSignal,
        maxRetries: 0,
      });
    })
  );

  function reportError(fieldName: string, error: unknown) {
    if (!isRequestAbortedError(error)) {
      logger.error(
        `Failed to fetch category aggregation for fieldName "${fieldName}", got: \n${JSON.stringify(
          error,
          null,
          2
        )}`
      );
      emitError(`Failed to fetch category aggregation for fieldName "${fieldName}".`);
    }
  }

  for (const [index, settledPromise] of settledPromises.entries()) {
    const fieldName = fieldNames[index];

    if (settledPromise.status === 'rejected') {
      reportError(fieldName, settledPromise.reason);
      // Still continue the analysis even if individual category queries fail.
      continue;
    }

    const resp = settledPromise.value;
    const { aggregations } = resp;

    if (aggregations === undefined) {
      reportError(fieldName, resp);
      // Still continue the analysis even if individual category queries fail.
      continue;
    }

    const sparkLinesPerCategory: SparkLinesPerCategory = {};
    const {
      categories: { buckets },
    } = randomSamplerWrapper.unwrap(
      aggregations as unknown as Record<string, estypes.AggregationsAggregate>
    ) as CategoriesAgg;

    const categories: Category[] = buckets.map((b) => {
      sparkLinesPerCategory[b.key] =
        b.sparkline === undefined
          ? {}
          : b.sparkline.buckets.reduce<Record<number, number>>((acc2, cur2) => {
              acc2[cur2.key] = cur2.doc_count;
              return acc2;
            }, {});

      return {
        key: b.key,
        count: b.doc_count,
        examples: b.hit.hits.hits.map((h) => get(h._source, fieldName)),
      };
    });
    result.push({
      categories,
      sparkLinesPerCategory,
    });
  }

  return result;
};
