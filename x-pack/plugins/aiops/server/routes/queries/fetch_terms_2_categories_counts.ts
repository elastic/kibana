/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { type SignificantTerm } from '@kbn/ml-agg-utils';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import type { AiopsLogRateAnalysisSchema } from '../../../common/api/log_rate_analysis';
import type { ItemsetResult } from '../../../common/types';
import { getCategoryQuery } from '../../../common/api/log_categorization/get_category_query';
import type { Category } from '../../../common/api/log_categorization/types';

import { isRequestAbortedError } from '../../lib/is_request_aborted_error';

import { getQueryWithParams } from './get_query_with_params';

const isMsearchResponseItem = (arg: unknown): arg is estypes.MsearchMultiSearchItem =>
  isPopulatedObject(arg, ['hits']);

export const getTerm2CategoryCountRequest = (
  params: AiopsLogRateAnalysisSchema,
  significantTerm: SignificantTerm,
  categoryFieldName: string,
  category: Category,
  from: number | undefined,
  to: number | undefined
): estypes.SearchRequest['body'] => {
  const query = getQueryWithParams({
    params,
  });

  const categoryQuery = getCategoryQuery(categoryFieldName, [category]);

  if (Array.isArray(query.bool?.filter)) {
    query.bool?.filter?.push({ term: { [significantTerm.fieldName]: significantTerm.fieldValue } });
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
    query,
    size: 0,
    track_total_hits: true,
  };
};

export async function fetchTerms2CategoriesCounts(
  esClient: ElasticsearchClient,
  params: AiopsLogRateAnalysisSchema,
  searchQuery: estypes.QueryDslQueryContainer,
  significantTerms: SignificantTerm[],
  significantCategories: SignificantTerm[],
  from: number,
  to: number,
  logger: Logger,
  emitError: (m: string) => void,
  abortSignal?: AbortSignal
) {
  const searches: Array<
    | estypes.MsearchMultisearchBody
    | {
        index: string;
      }
  > = [];
  const results: ItemsetResult[] = [];

  significantTerms.forEach((term) => {
    significantCategories.forEach((category) => {
      searches.push({ index: params.index });
      searches.push(
        getTerm2CategoryCountRequest(
          params,
          term,
          category.fieldName,
          { key: `${category.key}`, count: category.doc_count, examples: [] },
          from,
          to
        ) as estypes.MsearchMultisearchBody
      );
      results.push({
        set: {
          [term.fieldName]: term.fieldValue,
          [category.fieldName]: category.fieldValue,
        },
        size: 2,
        maxPValue: Math.max(term.pValue ?? 1, category.pValue ?? 1),
        doc_count: 0,
        support: 1,
        total_doc_count: 0,
      });
    });
  });

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
        `Failed to fetch term/category counts, got: \n${JSON.stringify(error, null, 2)}`
      );
      emitError(`Failed to fetch term/category counts.`);
    }
    return {
      fields: [],
      df: [],
      totalDocCount: 0,
    };
  }

  const mSearchResponses = mSearchresponse.responses;

  return {
    fields: uniq(significantCategories.map((c) => c.fieldName)),
    df: results
      .map((result, i) => {
        const resp = mSearchResponses[i];
        if (isMsearchResponseItem(resp)) {
          result.doc_count = (resp.hits.total as estypes.SearchTotalHits).value ?? 0;
        }
        return result;
      })
      .filter((d) => d.doc_count > 0),
    totalDocCount: 0,
  };
}
