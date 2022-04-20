/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from 'react-query';
import { number } from 'io-ts';
import { lastValueFrom } from 'rxjs';
import type { EsQuerySortValue, IEsSearchResponse } from '@kbn/data-plugin/common';
import type { CoreStart } from '@kbn/core/public';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { extractErrorMessage } from '../../../common/utils/helpers';
import * as TEXT from './translations';
import type { CspFinding, FindingsQueryResult } from './types';
import { useKibana } from '../../common/hooks/use_kibana';
import type { FindingsBaseEsQuery, FindingsQueryStatus } from './types';

interface UseFindingsOptions
  extends FindingsBaseEsQuery,
    FindingsGroupByNoneQuery,
    FindingsQueryStatus {}

export interface FindingsGroupByNoneQuery {
  from: NonNullable<estypes.SearchRequest['from']>;
  size: NonNullable<estypes.SearchRequest['size']>;
  sort: EsQuerySortValue[];
}

interface CspFindingsData {
  page: CspFinding[];
  total: number;
}

export type CspFindingsResult = FindingsQueryResult<CspFindingsData | undefined, unknown>;

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
}: Omit<UseFindingsOptions, 'enabled'>) => ({
  index,
  query,
  size,
  from,
  sort: mapEsQuerySortKey(sort),
});

export const useFindings = ({ enabled, index, query, sort, from, size }: UseFindingsOptions) => {
  const {
    data,
    notifications: { toasts },
  } = useKibana().services;

  return useQuery(
    ['csp_findings', { index, query, sort, from, size }],
    () =>
      lastValueFrom<IEsSearchResponse<CspFinding>>(
        data.search.search({
          params: getFindingsQuery({ index, query, sort, from, size }),
        })
      ),
    {
      enabled,
      select: ({ rawResponse: { hits } }) => ({
        page: hits.hits.map((hit) => hit._source!),
        total: number.is(hits.total) ? hits.total : 0,
      }),
      onError: (err) => showErrorToast(toasts, err),
    }
  );
};
