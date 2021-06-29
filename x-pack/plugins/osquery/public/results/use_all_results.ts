/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';

import { i18n } from '@kbn/i18n';
import { createFilter } from '../common/helpers';
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

import { generateTablePaginationOptions, getInspectResponse, InspectResponse } from './helpers';
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
      const responseData = await data.search
        .search<ResultsRequestOptions, ResultsStrategyResponse>(
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
        .toPromise();

      return {
        ...responseData,
        inspect: getInspectResponse(responseData, {} as InspectResponse),
      };
    },
    {
      refetchInterval: isLive ? 1000 : false,
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
