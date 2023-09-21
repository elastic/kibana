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
import { buildDataTableRecord } from '@kbn/discover-utils';
import { CspFinding } from '../../../../common/schemas/csp_finding';
import { useKibana } from '../../../common/hooks/use_kibana';
import type { Sort, FindingsBaseEsQuery } from '../../../common/types';
import { getAggregationCount, getFindingsCountAggQuery } from '../utils/utils';
import { CSP_LATEST_FINDINGS_DATA_VIEW } from '../../../../common/constants';
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
  index: CSP_LATEST_FINDINGS_DATA_VIEW,
  query,
  sort: getSortField(sort),
  size: MAX_FINDINGS_TO_LOAD,
  aggs: getFindingsCountAggQuery(),
  ignore_unavailable: false,
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
      if (!Array.isArray(aggregations.count.buckets))
        throw new Error('expected buckets to be an array');

      return {
        page: hits.hits.map((hit) => buildDataTableRecord(hit as estypes.EsHitRecord)),
        total: number.is(hits.total) ? hits.total : 0,
        count: getAggregationCount(aggregations.count.buckets),
      };
    },
    {
      enabled: options.enabled,
      keepPreviousData: true,
      onError: (err: Error) => showErrorToast(toasts, err),
    }
  );
};
