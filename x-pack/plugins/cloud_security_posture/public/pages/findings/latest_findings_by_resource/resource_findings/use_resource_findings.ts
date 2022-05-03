/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from 'react-query';
import { lastValueFrom } from 'rxjs';
import { IEsSearchResponse } from '@kbn/data-plugin/common';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { useKibana } from '../../../../common/hooks/use_kibana';
import { showErrorToast } from '../../latest_findings/use_latest_findings';
import type { CspFinding, FindingsBaseEsQuery, FindingsQueryResult } from '../../types';

interface UseResourceFindingsOptions extends FindingsBaseEsQuery {
  resourceId: string;
}

export type ResourceFindingsResult = FindingsQueryResult<
  ReturnType<typeof useResourceFindings>['data'] | undefined,
  unknown
>;

export const getResourceFindingsQuery = ({
  index,
  query,
  resourceId,
}: UseResourceFindingsOptions): estypes.SearchRequest => ({
  index,
  body: {
    query: {
      ...query,
      bool: {
        ...query?.bool,
        filter: [...(query?.bool?.filter || []), { term: { 'resource_id.keyword': resourceId } }],
      },
    },
  },
});

export const useResourceFindings = ({ index, query, resourceId }: UseResourceFindingsOptions) => {
  const {
    data,
    notifications: { toasts },
  } = useKibana().services;

  return useQuery(
    ['csp_resource_findings', { index, query, resourceId }],
    () =>
      lastValueFrom<IEsSearchResponse<CspFinding>>(
        data.search.search({
          params: getResourceFindingsQuery({ index, query, resourceId }),
        })
      ),
    {
      select: ({ rawResponse: { hits } }) => ({
        page: hits.hits.map((hit) => hit._source!),
        total: hits.total as number,
      }),
      onError: (err) => showErrorToast(toasts, err),
    }
  );
};
