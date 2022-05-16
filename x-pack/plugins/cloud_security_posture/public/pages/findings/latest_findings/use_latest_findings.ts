/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from 'react-query';
import { number } from 'io-ts';
import { lastValueFrom } from 'rxjs';
import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import type { CoreStart } from '@kbn/core/public';
import type { Criteria, Pagination } from '@elastic/eui';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { extractErrorMessage } from '../../../../common/utils/helpers';
import * as TEXT from '../translations';
import type { CspFinding, FindingsQueryResult } from '../types';
import { useKibana } from '../../../common/hooks/use_kibana';
import type { FindingsBaseEsQuery } from '../types';

interface UseFindingsOptions extends FindingsBaseEsQuery {
  from: NonNullable<estypes.SearchRequest['from']>;
  size: NonNullable<estypes.SearchRequest['size']>;
  sort: Sort;
}

type Sort = NonNullable<Criteria<CspFinding>['sort']>;

export interface FindingsGroupByNoneQuery {
  pageIndex: Pagination['pageIndex'];
  pageSize: Pagination['pageSize'];
  sort: Sort;
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

export const showErrorToast = (
  toasts: CoreStart['notifications']['toasts'],
  error: unknown
): void => {
  if (error instanceof Error) toasts.addError(error, { title: TEXT.SEARCH_FAILED });
  else toasts.addDanger(extractErrorMessage(error, TEXT.SEARCH_FAILED));
};

export const getFindingsQuery = ({ index, query, size, from, sort }: UseFindingsOptions) => ({
  index,
  query,
  size,
  from,
  sort: [{ [getSortKey(sort.field)]: sort.direction }],
});

export const useLatestFindings = ({ index, query, sort, from, size }: UseFindingsOptions) => {
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
      keepPreviousData: true,
      select: ({ rawResponse: { hits } }) => ({
        page: hits.hits.map((hit) => hit._source!),
        total: number.is(hits.total) ? hits.total : 0,
      }),
      onError: (err) => showErrorToast(toasts, err),
    }
  );
};
