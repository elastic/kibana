/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';

import { createFilter } from '../common/helpers';
import { useKibana } from '../common/lib/kibana';
import {
  DocValueFields,
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
  docValueFields?: DocValueFields[];
  filterQuery?: ESTermQuery | string;
  skip?: boolean;
}

export const useActionDetails = ({
  actionId,
  docValueFields,
  filterQuery,
  skip = false,
}: UseActionDetails) => {
  const { data } = useKibana().services;

  const [actionDetailsRequest, setHostRequest] = useState<ActionDetailsRequestOptions | null>(null);

  const response = useQuery(
    ['action', { actionId }],
    async () => {
      if (!actionDetailsRequest) return Promise.resolve();

      const responseData = await data.search
        .search<ActionDetailsRequestOptions, ActionDetailsStrategyResponse>(actionDetailsRequest!, {
          strategy: 'osquerySearchStrategy',
        })
        .toPromise();

      return {
        ...responseData,
        inspect: getInspectResponse(responseData, {}),
      };
    },
    {
      enabled: !skip && !!actionDetailsRequest,
    }
  );

  useEffect(() => {
    setHostRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {}),
        actionId,
        docValueFields: docValueFields ?? [],
        factoryQueryType: OsqueryQueries.actionDetails,
        filterQuery: createFilter(filterQuery),
      };
      if (!deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [actionId, docValueFields, filterQuery]);

  return response;
};
