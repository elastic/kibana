/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import deepEqual from 'fast-deep-equal';
import { useCallback, useEffect, useRef, useState } from 'react';

import { createFilter } from '../common/helpers';
import { useKibana } from '../common/lib/kibana';
import {
  PageInfoPaginated,
  DocValueFields,
  OsqueryQueries,
  AgentsRequestOptions,
  AgentsStrategyResponse,
  Direction,
} from '../../common/search_strategy';
import { ESTermQuery } from '../../common/typed_json';
import { Agent } from '../../common/shared_imports';

import * as i18n from './translations';
import { isCompleteResponse, isErrorResponse } from '../../../../../src/plugins/data/common';
import { AbortError } from '../../../../../src/plugins/kibana_utils/common';
import { generateTablePaginationOptions, getInspectResponse, InspectResponse } from './helpers';

const ID = 'agentsAllQuery';

export interface AgentsArgs {
  agents: Agent[];
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  pageInfo: PageInfoPaginated;
  totalCount: number;
}

interface UseAllAgents {
  activePage: number;
  direction: Direction;
  limit: number;
  sortField: string;
  docValueFields?: DocValueFields[];
  filterQuery?: ESTermQuery | string;
  skip?: boolean;
}

export const useAllAgents = ({
  activePage,
  direction,
  limit,
  sortField,
  docValueFields,
  filterQuery,
  skip = false,
}: UseAllAgents): [boolean, AgentsArgs] => {
  const { data, notifications } = useKibana().services;

  const abortCtrl = useRef(new AbortController());
  const [loading, setLoading] = useState(false);
  const [agentsRequest, setHostRequest] = useState<AgentsRequestOptions | null>(null);

  const [agentsResponse, setAgentsResponse] = useState<AgentsArgs>({
    agents: [],
    id: ID,
    inspect: {
      dsl: [],
      response: [],
    },
    isInspected: false,
    pageInfo: {
      activePage: 0,
      fakeTotalCount: 0,
      showMorePagesIndicator: false,
    },
    totalCount: -1,
  });

  const agentsSearch = useCallback(
    (request: AgentsRequestOptions | null) => {
      if (request == null || skip) {
        return;
      }

      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        const searchSubscription$ = data.search
          .search<AgentsRequestOptions, AgentsStrategyResponse>(request, {
            strategy: 'osquerySearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                if (!didCancel) {
                  setLoading(false);
                  setAgentsResponse((prevResponse) => ({
                    ...prevResponse,
                    agents: response.edges,
                    inspect: getInspectResponse(response, prevResponse.inspect),
                    pageInfo: response.pageInfo,
                    totalCount: response.totalCount,
                  }));
                }
                searchSubscription$.unsubscribe();
              } else if (isErrorResponse(response)) {
                if (!didCancel) {
                  setLoading(false);
                }
                // TODO: Make response error status clearer
                notifications.toasts.addWarning(i18n.ERROR_ALL_AGENTS);
                searchSubscription$.unsubscribe();
              }
            },
            error: (msg) => {
              if (!(msg instanceof AbortError)) {
                notifications.toasts.addDanger({ title: i18n.FAIL_ALL_AGENTS, text: msg.message });
              }
            },
          });
      };
      abortCtrl.current.abort();
      asyncSearch();
      return () => {
        didCancel = true;
        abortCtrl.current.abort();
      };
    },
    [data.search, notifications.toasts, skip]
  );

  useEffect(() => {
    setHostRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {}),
        docValueFields: docValueFields ?? [],
        factoryQueryType: OsqueryQueries.agents,
        filterQuery: createFilter(filterQuery),
        pagination: generateTablePaginationOptions(activePage, limit),
        sort: {
          direction,
          field: sortField,
        },
      };
      if (!deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [activePage, direction, docValueFields, filterQuery, limit, sortField]);

  useEffect(() => {
    agentsSearch(agentsRequest);
  }, [agentsRequest, agentsSearch]);

  return [loading, agentsResponse];
};
