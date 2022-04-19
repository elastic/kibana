/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type UseQueryResult, useQuery } from 'react-query';
import { number } from 'io-ts';
import type { Filter } from '@kbn/es-query';
import { lastValueFrom } from 'rxjs';
import type {
  EsQuerySortValue,
  IEsSearchResponse,
  SerializedSearchSourceFields,
} from '@kbn/data-plugin/common';
import type { CoreStart } from '@kbn/core/public';
import { extractErrorMessage } from '../../../common/utils/helpers';
import * as TEXT from './translations';
import type { CspFinding } from './types';
import { useKibana } from '../../common/hooks/use_kibana';
import type { FindingsBaseQuery } from './findings_container';

export interface CspFindingsRequest
  extends Required<Pick<SerializedSearchSourceFields, 'sort' | 'size' | 'from' | 'query'>> {
  filters: Filter[];
}

type UseFindingsOptions = FindingsBaseQuery & Omit<CspFindingsRequest, 'filters' | 'query'>;

interface CspFindingsData {
  page: CspFinding[];
  total: number;
}

type Result = UseQueryResult<CspFindingsData, unknown>;

export interface CspFindingsResult {
  loading: Result['isLoading'];
  error: Result['error'];
  data: CspFindingsData | undefined;
}

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

export const showErrorToast = (
  toasts: CoreStart['notifications']['toasts'],
  error: unknown
): void => {
  if (error instanceof Error) toasts.addError(error, { title: TEXT.SEARCH_FAILED });
  else toasts.addDanger(extractErrorMessage(error, TEXT.SEARCH_FAILED));
};

export const getFindingsQuery = ({
  index,
  query,
  size,
  from,
  sort,
}: Omit<UseFindingsOptions, 'error'>) => ({
  index,
  query,
  size,
  from,
  sort: mapEsQuerySortKey(sort),
});

export const useFindings = ({ error, index, query, sort, from, size }: UseFindingsOptions) => {
  const {
    data,
    notifications: { toasts },
  } = useKibana().services;

  return useQuery(
    ['csp_findings', { from, size, query, sort }],
    () =>
      lastValueFrom<IEsSearchResponse<CspFinding>>(
        data.search.search({
          params: getFindingsQuery({ index, query, sort, from, size }),
        })
      ),
    {
      enabled: !error,
      select: ({ rawResponse: { hits } }) => ({
        // TODO: use 'fields' instead of '_source' ?
        page: hits.hits.map((hit) => hit._source!),
        total: number.is(hits.total) ? hits.total : 0,
      }),
      onError: (err) => showErrorToast(toasts, err),
    }
  );
};
