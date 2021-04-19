/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';

import { createFilter } from '../common/helpers';
import { useKibana } from '../common/lib/kibana';
import {
  OsqueryQueries,
  ActionDetailsRequestOptions,
  ActionDetailsStrategyResponse,
} from '../../common/search_strategy';
import { ESTermQuery } from '../../common/typed_json';

import { getInspectResponse, InspectResponse } from './helpers';

export interface ActionDetailsArgs {
  actionDetails: Record<string, string>;
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
}

interface UseActionDetails {
  actionId: string;
  filterQuery?: ESTermQuery | string;
  skip?: boolean;
}

export const useActionDetails = ({ actionId, filterQuery, skip = false }: UseActionDetails) => {
  const { data } = useKibana().services;

  return useQuery(
    ['actionDetails', { actionId, filterQuery }],
    async () => {
      const responseData = await data.search
        .search<ActionDetailsRequestOptions, ActionDetailsStrategyResponse>(
          {
            actionId,
            factoryQueryType: OsqueryQueries.actionDetails,
            filterQuery: createFilter(filterQuery),
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
      enabled: !skip,
    }
  );
};
