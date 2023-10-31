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
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import type { AiopsLogRateAnalysisSchema } from '../../../../common/api/log_rate_analysis';
import { getCategoryQuery } from '../../../../common/api/log_categorization/get_category_query';
import type { Category } from '../../../../common/api/log_categorization/types';

import { isRequestAbortedError } from '../../../lib/is_request_aborted_error';

import { getQueryWithParams } from './get_query_with_params';
import type { FetchCategoriesResponse } from './fetch_categories';

const isMsearchResponseItem = (arg: unknown): arg is estypes.MsearchMultiSearchItem =>
  isPopulatedObject(arg, ['hits']);

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

  const searches = categories.categories.flatMap((category) => [
    { index: params.index },
    getCategoryCountRequest(params, fieldName, category, from, to)
      .body as estypes.MsearchMultisearchBody,
  ]);

  let mSearchresponse;

  try {
    mSearchresponse = await esClient.msearch(
      { searches },
      {
        signal: abortSignal,
        maxRetries: 0,
      }
    );
  } catch (error) {
    if (!isRequestAbortedError(error)) {
      logger.error(
        `Failed to fetch category counts for field name "${fieldName}", got: \n${JSON.stringify(
          error,
          null,
          2
        )}`
      );
      emitError(`Failed to fetch category counts for field name "${fieldName}".`);
    }
    return updatedCategories;
  }

  for (const [index, resp] of mSearchresponse.responses.entries()) {
    if (isMsearchResponseItem(resp)) {
      updatedCategories.categories[index].count =
        (resp.hits.total as estypes.SearchTotalHits).value ?? 0;
    } else {
      logger.error(
        `Failed to fetch category count for category "${
          updatedCategories.categories[index].key
        }", got: \n${JSON.stringify(resp, null, 2)}`
      );
      emitError(
        `Failed to fetch category count for category "${updatedCategories.categories[index].key}".`
      );
    }
  }

  return updatedCategories;
};
