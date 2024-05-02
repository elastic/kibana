/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useInfiniteQuery } from '@tanstack/react-query';
import { number } from 'io-ts';
import { lastValueFrom } from 'rxjs';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/data-plugin/common';
import type { Pagination } from '@elastic/eui';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { EsHitRecord } from '@kbn/discover-utils/types';
import { CspFinding } from '../../../../common/schemas/csp_finding';
import { useKibana } from '../../../common/hooks/use_kibana';
import type { FindingsBaseEsQuery } from '../../../common/types';
import { getAggregationCount, getFindingsCountAggQuery } from '../utils/utils';
import {
  CSP_LATEST_FINDINGS_DATA_VIEW,
  LATEST_FINDINGS_RETENTION_POLICY,
} from '../../../../common/constants';
import { MAX_FINDINGS_TO_LOAD } from '../../../common/constants';
import { showErrorToast } from '../../../common/utils/show_error_toast';
import { useGetCspBenchmarkRulesStatesApi } from './use_get_benchmark_rules_state_api';
import { CspBenchmarkRulesStates } from '../../../../common/types/latest';
import { buildMutedRulesFilter } from '../../../../common/utils/rules_states';

interface UseFindingsOptions extends FindingsBaseEsQuery {
  sort: string[][];
  enabled: boolean;
  pageSize: number;
}

export interface FindingsGroupByNoneQuery {
  pageIndex: Pagination['pageIndex'];
  sort: any;
}

type LatestFindingsRequest = IKibanaSearchRequest<estypes.SearchRequest>;
type LatestFindingsResponse = IKibanaSearchResponse<
  estypes.SearchResponse<CspFinding, FindingsAggs>
>;

interface FindingsAggs {
  count: estypes.AggregationsMultiBucketAggregateBase<estypes.AggregationsStringRareTermsBucketKeys>;
}

export const getFindingsQuery = (
  { query, sort }: UseFindingsOptions,
  rulesStates: CspBenchmarkRulesStates,
  pageParam: any
) => {
  const mutedRulesFilterQuery = buildMutedRulesFilter(rulesStates);

  return {
    index: CSP_LATEST_FINDINGS_DATA_VIEW,
    sort: getMultiFieldsSort(sort),
    size: MAX_FINDINGS_TO_LOAD,
    aggs: getFindingsCountAggQuery(),
    ignore_unavailable: false,
    query: {
      ...query,
      bool: {
        ...query?.bool,
        filter: [
          ...(query?.bool?.filter ?? []),
          {
            range: {
              '@timestamp': {
                gte: `now-${LATEST_FINDINGS_RETENTION_POLICY}`,
                lte: 'now',
              },
            },
          },
        ],
        must_not: [...(query?.bool?.must_not ?? []), ...mutedRulesFilterQuery],
      },
    },
    ...(pageParam ? { from: pageParam } : {}),
  };
};

const getMultiFieldsSort = (sort: string[][]) => {
  return sort.map(([id, direction]) => {
    return {
      ...getSortField({ field: id, direction }),
    };
  });
};

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
const getSortField = ({ field, direction }: { field: string; direction: string }) => {
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
  console.log('useLatestFindings');

  const {
    data,
    //   //   notifications: { toasts },
  } = useKibana().services;
  // const { data: rulesStates } = useGetCspBenchmarkRulesStatesApi();

  // /**
  //  * We're using useInfiniteQuery in this case to allow the user to fetch more data (if available and up to 10k)
  //  * useInfiniteQuery differs from useQuery because it accumulates and caches a chunk of data from the previous fetches into an array
  //  * it uses the getNextPageParam to know if there are more pages to load and retrieve the position of
  //  * the last loaded record to be used as a from parameter to fetch the next chunk of data.
  //  */
  // console.log('rulesStates', rulesStates);
  const rulesStates = {
    'cis_aws;v1.5.0;1.5': {
      muted: true,
      benchmark_id: 'cis_aws',
      benchmark_version: 'v1.5.0',
      rule_number: '1.5',
      rule_id: '4b1f12b8-5fe6-5cc6-b404-58df727bcd45',
    },
  };
  return useInfiniteQuery(
    ['csp_findings', { params: options }, rulesStates],
    async ({ pageParam }) => {
      // console.log('data', data);
      // console.log('data.search', data.search);
      // console.log('data.search.search', data.search.search);

      // const res = await data.search.search({
      //   params: getFindingsQuery(options, {}, 1), // ruleStates always exists since it under the `enabled` dependency.
      // });
      // console.log('res', res);
      const {
        rawResponse: { hits, aggregations },
      } = await lastValueFrom(
        data.search.search<LatestFindingsRequest, LatestFindingsResponse>({
          params: getFindingsQuery(options, rulesStates!, pageParam), // ruleStates always exists since it under the `enabled` dependency.
        })
      );

      // const source = data.search.search<LatestFindingsRequest, LatestFindingsResponse>({
      //   params: getFindingsQuery(options, rulesStates!, pageParam), // ruleStates always exists since it under the `enabled` dependency.
      // });
      // console.log('source', source);

      // const res = await new Promise((resolve, reject) => {
      //   let _hasValue = false;
      //   let _value;
      //   source.subscribe({
      //     next: (value) => {
      //       console.log('value', value);
      //       _value = value;
      //       _hasValue = true;
      //     },
      //     error: reject,
      //     complete: () => {
      //       if (_hasValue) {
      //         resolve(_value);
      //         // } else if (hasConfig) {
      //         // resolve(config!.defaultValue);
      //       } else {
      //         console.log('errr');
      //         // reject(new EmptyError());
      //       }
      //     },
      //   });
      // });

      // console.log('res', res);

      // const { hits, aggregations } = res.rawResponse;

      console.log('hits', hits);
      console.log('aggregations', aggregations);

      if (!aggregations) throw new Error('expected aggregations to be an defined');
      if (!Array.isArray(aggregations.count.buckets))
        throw new Error('expected buckets to be an array');

      return {
        page: hits.hits.map((hit) => buildDataTableRecord(hit as EsHitRecord)),
        total: number.is(hits.total) ? hits.total : 0,
        count: getAggregationCount(aggregations.count.buckets),
      };
    },
    {
      // enabled: options.enabled && !!rulesStates,
      enabled: true,
      keepPreviousData: true,
      // onError: (err: Error) => showErrorToast(toasts, err),
      onError: (err: Error) => console.log(err),
      getNextPageParam: (lastPage, allPages) => {
        if (lastPage.page.length < options.pageSize) {
          return undefined;
        }
        return allPages.length * options.pageSize;
      },
    }
  );
};
