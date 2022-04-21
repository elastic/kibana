/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';

import { i18n } from '@kbn/i18n';
import { firstValueFrom } from 'rxjs';
import {
  createFilter,
  generateTablePaginationOptions,
  getInspectResponse,
  InspectResponse,
} from '../common/helpers';
import { useKibana } from '../common/lib/kibana';
import {
  ResultEdges,
  PageInfoPaginated,
  OsqueryQueries,
  ResultsRequestOptions,
  ResultsStrategyResponse,
  Direction,
} from '../../common/search_strategy';
import { ESTermQuery } from '../../common/typed_json';

import { useErrorToast } from '../common/hooks/use_error_toast';

export interface ResultsArgs {
  results: ResultEdges;
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  pageInfo: PageInfoPaginated;
  totalCount: number;
}

interface UseAllResults {
  actionId: string;
  activePage: number;
  limit: number;
  sort: Array<{ field: string; direction: Direction }>;
  filterQuery?: ESTermQuery | string;
  skip?: boolean;
  isLive?: boolean;
}

export const useAllResults = ({
  actionId,
  activePage,
  limit,
  sort,
  filterQuery,
  skip = false,
  isLive = false,
}: UseAllResults) => {
  const { data } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useQuery(
    ['allActionResults', { actionId, activePage, limit, sort }],
    async () => {
      const responseData = await firstValueFrom(
        data.search.search<ResultsRequestOptions, ResultsStrategyResponse>(
          {
            actionId,
            factoryQueryType: OsqueryQueries.results,
            filterQuery: createFilter(filterQuery),
            pagination: generateTablePaginationOptions(activePage, limit),
            sort,
          },
          {
            strategy: 'osquerySearchStrategy',
          }
        )
      );

      if (!responseData?.edges?.length && responseData.totalCount) {
        throw new Error('Empty edges while positive totalCount');
      }

      return {
        ...responseData,
        columns: Object.keys(
          (responseData.edges?.length && responseData.edges[0].fields) || {}
        ).sort(),
        inspect: getInspectResponse(responseData, {} as InspectResponse),
      };
    },
    {
      keepPreviousData: true,
      refetchInterval: isLive ? 5000 : false,
      enabled: !skip,
      onSuccess: () => setErrorToast(),
      onError: (error: Error) =>
        setErrorToast(error, {
          title: i18n.translate('xpack.osquery.results.fetchError', {
            defaultMessage: 'Error while fetching results',
          }),
        }),
    }
  );
};
