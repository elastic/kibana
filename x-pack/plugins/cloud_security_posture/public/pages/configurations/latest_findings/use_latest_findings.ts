/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import { number } from 'io-ts';
import { lastValueFrom } from 'rxjs';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/data-plugin/common';
import type { Pagination } from '@elastic/eui';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { CspFinding } from '../../../../common/schemas/csp_finding';
import { useKibana } from '../../../common/hooks/use_kibana';
import type { Sort, FindingsBaseEsQuery } from '../../../common/types';
import { getFindingsCountAggQuery, getFindingsTimeRangeQuery } from '../utils/utils';
import { FINDINGS_INDEX_PATTERN } from '../../../../common/constants';
import { MAX_FINDINGS_TO_LOAD } from '../../../common/constants';
import { showErrorToast } from '../../../common/utils/show_error_toast';

interface UseFindingsOptions extends FindingsBaseEsQuery {
  sort: Sort<CspFinding>;
  enabled: boolean;
}

export interface FindingsGroupByNoneQuery {
  pageIndex: Pagination['pageIndex'];
  sort: Sort<CspFinding>;
}

type LatestFindingsRequest = IKibanaSearchRequest<estypes.SearchRequest>;
type LatestFindingsResponse = IKibanaSearchResponse<
  estypes.SearchResponse<CspFinding, FindingsAggs>
>;

interface FindingsAggs {
  count: estypes.AggregationsMultiBucketAggregateBase<estypes.AggregationsStringRareTermsBucketKeys>;
}

export const getFindingsQuery = ({ query, sort }: UseFindingsOptions) => ({
  index: FINDINGS_INDEX_PATTERN,
  query: getFindingsTimeRangeQuery(query),
  sort: getSortField(sort),
  size: MAX_FINDINGS_TO_LOAD,
  aggs: getFindingsCountAggQuery(),
  ignore_unavailable: false,
  // collapse: {
  //   field: 'event.code',
  //   inner_hits: {
  //     name: 'latest_result_evaluation',
  //     size: 1,
  //     sort: [{ '@timestamp': 'desc' }],
  //   },
  // },
});

/**
 * By default, ES will sort keyword fields in case-sensitive format, the
 * following fields are required to have a case-insensitive sorting.
 */
const fieldsRequiredSortingByPainlessScript = [
  'rule.section',
  'resource.name',
  'resource.sub_type',
];

/**
 * Generates Painless sorting if the given field is matched or returns default sorting
 * This painless script will sort the field in case-insensitive manner
 */
const getSortField = ({ field, direction }: Sort<CspFinding>) => {
  if (fieldsRequiredSortingByPainlessScript.includes(field)) {
    return {
      _script: {
        type: 'string',
        order: direction,
        script: {
          source: `doc["${field}"].value.toLowerCase()`,
          lang: 'painless',
        },
      },
    };
  }
  return { [field]: direction };
};

export const useLatestFindings = (options: UseFindingsOptions) => {
  const {
    data,
    notifications: { toasts },
  } = useKibana().services;
  return useQuery(
    ['csp_findings', { params: options }],
    async () => {
      const {
        rawResponse: { hits, aggregations },
      } = await lastValueFrom(
        data.search.search<LatestFindingsRequest, LatestFindingsResponse>({
          params: getFindingsQuery(options),
        })
      );
      if (!aggregations) throw new Error('expected aggregations to be an defined');

      let totalPassed = 0;
      let totalFailed = 0;
      let findingsBucketsLength = aggregations.unique_event_code.buckets.length;

      for (let i = 0; i < findingsBucketsLength; i++) {
        const evaluationBucket = aggregations.unique_event_code.buckets[i];
        const latestResultEvaluation =
          evaluationBucket.latest_result_evaluation.hits.hits[0]._source.result.evaluation;
        totalPassed += latestResultEvaluation === 'passed' ? 1 : 0;
        totalFailed += latestResultEvaluation === 'failed' ? 1 : 0;
      }

      return {
        page: hits.hits.map((hit) => hit._source!),
        total: totalFailed + totalPassed,
        count: {
          failed: totalFailed,
          passed: totalPassed,
        },
      };
    },
    {
      enabled: options.enabled,
      keepPreviousData: true,
      onError: (err: Error) => showErrorToast(toasts, err),
    }
  );
};
