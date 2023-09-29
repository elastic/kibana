/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';

import type { AiopsLogRateAnalysisSchema } from '../../../common/api/log_rate_analysis';
import { getCategoryQuery } from '../../../common/api/log_categorization/get_category_query';
import type { Category } from '../../../common/api/log_categorization/types';

import { isRequestAbortedError } from '../../lib/is_request_aborted_error';

import { getQueryWithParams } from './get_query_with_params';
import type { FetchCategoriesResponse } from './fetch_categories';

export const getCategoryCountRequest = (
  params: AiopsLogRateAnalysisSchema,
  fieldName: string,
  category: Category,
  from: number | undefined,
  to: number | undefined
): estypes.SearchRequest => {
  const { index } = params;

  const query = getQueryWithParams({
    params,
  });

  const categoryQuery = getCategoryQuery(fieldName, [category]);

  if (Array.isArray(query.bool?.filter)) {
    query.bool?.filter?.push(categoryQuery);
    query.bool?.filter?.push({
      range: {
        [params.timeFieldName]: {
          gte: from,
          lte: to,
          format: 'epoch_millis',
        },
      },
    });
  }

  return {
    index,
    body: {
      query,
      size: 0,
      track_total_hits: true,
    },
  };
};

export const fetchCategoryCounts = async (
  esClient: ElasticsearchClient,
  params: AiopsLogRateAnalysisSchema,
  fieldName: string,
  categories: FetchCategoriesResponse,
  from: number | undefined,
  to: number | undefined,
  logger: Logger,
  emitError: (m: string) => void,
  abortSignal?: AbortSignal
): Promise<FetchCategoriesResponse> => {
  const updatedCategories = cloneDeep(categories);

  const settledPromises = await Promise.allSettled(
    categories.categories.map((category) => {
      const request = getCategoryCountRequest(params, fieldName, category, from, to);
      return esClient.search(request, {
        signal: abortSignal,
        maxRetries: 0,
      });
    })
  );

  function reportError(categoryKey: string, error: unknown) {
    if (!isRequestAbortedError(error)) {
      logger.error(
        `Failed to fetch category count for category "${categoryKey}", got: \n${JSON.stringify(
          error,
          null,
          2
        )}`
      );
      emitError(`Failed to fetch category count for category "${categoryKey}".`);
    }
  }

  for (const [index, settledPromise] of settledPromises.entries()) {
    const category = updatedCategories.categories[index];

    if (settledPromise.status === 'rejected') {
      reportError(category.key, settledPromise.reason);
      // Still continue the analysis even if individual category queries fail.
      continue;
    }

    const resp = settledPromise.value;

    updatedCategories.categories[index].count =
      (resp.hits.total as estypes.SearchTotalHits).value ?? 0;
  }

  return updatedCategories;
};
