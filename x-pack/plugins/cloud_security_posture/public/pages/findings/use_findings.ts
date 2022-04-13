/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Filter } from '@kbn/es-query';
import { type UseQueryResult, useQuery } from 'react-query';
import type { AggregationsAggregate, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { number } from 'io-ts';
import { extractErrorMessage } from '../../../common/utils/helpers';
import type {
  DataView,
  EsQuerySortValue,
  IKibanaSearchResponse,
  SerializedSearchSourceFields,
} from '../../../../../../src/plugins/data/common';
import type { CspClientPluginStartDeps } from '../../types';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import * as TEXT from './translations';
import type { CoreStart } from '../../../../../../src/core/public';
import type { CspFinding } from './types';

interface CspFindings {
  data: CspFinding[];
  total: number;
}

export interface CspFindingsRequest
  extends Required<Pick<SerializedSearchSourceFields, 'sort' | 'size' | 'from' | 'query'>> {
  filters: Filter[];
}

type ResponseProps = 'data' | 'error' | 'status';
type Result = UseQueryResult<CspFindings, unknown>;

// TODO: use distributive Pick
export type CspFindingsResponse =
  | Pick<Extract<Result, { status: 'success' }>, ResponseProps>
  | Pick<Extract<Result, { status: 'error' }>, ResponseProps>
  | Pick<Extract<Result, { status: 'idle' }>, ResponseProps>
  | Pick<Extract<Result, { status: 'loading' }>, ResponseProps>;

const FIELDS_WITHOUT_KEYWORD_MAPPING = new Set(['@timestamp']);

// NOTE: .keyword comes from the mapping we defined for the Findings index
const getSortKey = (key: string): string =>
  FIELDS_WITHOUT_KEYWORD_MAPPING.has(key) ? key : `${key}.keyword`;

/**
 * @description utility to transform a column header key to its field mapping for sorting
 * @example Adds '.keyword' to every property we sort on except values of `FIELDS_WITHOUT_KEYWORD_MAPPING`
 * @todo find alternative
 * @note we choose the keyword 'keyword' in the field mapping
 */
const mapEsQuerySortKey = (sort: readonly EsQuerySortValue[]): EsQuerySortValue[] =>
  sort.slice().reduce<EsQuerySortValue[]>((acc, cur) => {
    const entry = Object.entries(cur)[0];
    if (!entry) return acc;

    const [k, v] = entry;
    acc.push({ [getSortKey(k)]: v });

    return acc;
  }, []);

const showResponseErrorToast =
  ({ toasts }: CoreStart['notifications']) =>
  (error: unknown): void => {
    if (error instanceof Error) toasts.addError(error, { title: TEXT.SEARCH_FAILED });
    else toasts.addDanger(extractErrorMessage(error, TEXT.SEARCH_FAILED));
  };

const extractFindings = ({
  rawResponse: { hits },
}: IKibanaSearchResponse<
  SearchResponse<CspFinding, Record<string, AggregationsAggregate>>
>): CspFindings => ({
  // TODO: use 'fields' instead of '_source' ?
  data: hits.hits.map((hit) => hit._source!),
  total: number.is(hits.total) ? hits.total : 0,
});

const createFindingsSearchSource = (
  {
    query,
    dataView,
    filters,
    ...rest
  }: Omit<CspFindingsRequest, 'queryKey'> & { dataView: DataView },
  queryService: CspClientPluginStartDeps['data']['query']
): SerializedSearchSourceFields => {
  if (query) queryService.queryString.setQuery(query);

  return {
    ...rest,
    sort: mapEsQuerySortKey(rest.sort),
    filter: queryService.filterManager.getFilters(),
    query: queryService.queryString.getQuery(),
    index: dataView.id, // TODO: constant
  };
};

/**
 * @description a react-query#mutation wrapper on the data plugin searchSource
 * @todo use 'searchAfter'. currently limited to 10k docs. see https://github.com/elastic/kibana/issues/116776
 */
export const useFindings = (
  dataView: DataView,
  searchProps: CspFindingsRequest,
  urlKey?: string // Needed when URL query (searchProps) didn't change (now-15) but require a refetch
): CspFindingsResponse => {
  const {
    notifications,
    data: { query, search },
  } = useKibana<CspClientPluginStartDeps>().services;

  return useQuery(
    ['csp_findings', { searchProps, urlKey }],
    async () => {
      const source = await search.searchSource.create(
        createFindingsSearchSource({ ...searchProps, dataView }, query)
      );

      const response = await source.fetch$().toPromise();

      return response;
    },
    {
      cacheTime: 0,
      onError: showResponseErrorToast(notifications!),
      select: extractFindings,
    }
  );
};
