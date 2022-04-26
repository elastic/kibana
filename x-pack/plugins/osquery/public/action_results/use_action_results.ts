/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flatten, reverse, uniqBy } from 'lodash/fp';
import { useQuery } from 'react-query';

import { i18n } from '@kbn/i18n';
import { firstValueFrom } from 'rxjs';
import {
  createFilter,
  getInspectResponse,
  InspectResponse,
  generateTablePaginationOptions,
} from '../common/helpers';
import { useKibana } from '../common/lib/kibana';
import {
  ResultEdges,
  PageInfoPaginated,
  OsqueryQueries,
  ActionResultsRequestOptions,
  ActionResultsStrategyResponse,
  Direction,
} from '../../common/search_strategy';
import { ESTermQuery } from '../../common/typed_json';
import { queryClient } from '../query_client';

import { useErrorToast } from '../common/hooks/use_error_toast';

export interface ResultsArgs {
  results: ResultEdges;
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  pageInfo: PageInfoPaginated;
  totalCount: number;
}

export interface UseActionResults {
  actionId: string;
  activePage: number;
  agentIds?: string[];
  direction: Direction;
  limit: number;
  sortField: string;
  filterQuery?: ESTermQuery | string;
  skip?: boolean;
  isLive?: boolean;
}

export const useActionResults = ({
  actionId,
  activePage,
  agentIds,
  direction,
  limit,
  sortField,
  filterQuery,
  skip = false,
  isLive = false,
}: UseActionResults) => {
  const { data } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useQuery(
    ['actionResults', { actionId }],
    async () => {
      const responseData = await firstValueFrom(
        data.search.search<ActionResultsRequestOptions, ActionResultsStrategyResponse>(
          {
            actionId,
            factoryQueryType: OsqueryQueries.actionResults,
            filterQuery: createFilter(filterQuery),
            pagination: generateTablePaginationOptions(activePage, limit),
            sort: {
              direction,
              field: sortField,
            },
          },
          {
            strategy: 'osquerySearchStrategy',
          }
        )
      );

      const totalResponded =
        // @ts-expect-error update types
        responseData.rawResponse?.aggregations?.aggs.responses_by_action_id?.doc_count ?? 0;
      const totalRowCount =
        // @ts-expect-error update types
        responseData.rawResponse?.aggregations?.aggs.responses_by_action_id?.rows_count?.value ?? 0;
      const aggsBuckets =
        // @ts-expect-error update types
        responseData.rawResponse?.aggregations?.aggs.responses_by_action_id?.responses.buckets;

      const cachedData = queryClient.getQueryData(['actionResults', { actionId }]);

      // @ts-expect-error update types
      const previousEdges = cachedData?.edges.length
        ? // @ts-expect-error update types
          cachedData?.edges
        : agentIds?.map((agentId) => ({ fields: { agent_id: [agentId] } })) ?? [];

      return {
        ...responseData,
        edges: reverse(uniqBy('fields.agent_id[0]', flatten([responseData.edges, previousEdges]))),
        aggregations: {
          totalRowCount,
          totalResponded,
          // @ts-expect-error update types
          successful: aggsBuckets?.find((bucket) => bucket.key === 'success')?.doc_count ?? 0,
          // @ts-expect-error update types
          failed: aggsBuckets?.find((bucket) => bucket.key === 'error')?.doc_count ?? 0,
        },
        inspect: getInspectResponse(responseData, {} as InspectResponse),
      };
    },
    {
      initialData: {
        edges: [],
        aggregations: {
          totalResponded: 0,
          successful: 0,
          // @ts-expect-error update types
          pending: agentIds?.length ?? 0,
          failed: 0,
        },
      },
      refetchInterval: isLive ? 5000 : false,
      keepPreviousData: true,
      enabled: !skip && !!agentIds?.length,
      onSuccess: () => setErrorToast(),
      onError: (error: Error) =>
        setErrorToast(error, {
          title: i18n.translate('xpack.osquery.action_results.fetchError', {
            defaultMessage: 'Error while fetching action results',
          }),
        }),
    }
  );
};
