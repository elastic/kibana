/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import deepEqual from 'fast-deep-equal';
import { noop } from 'lodash/fp';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import { DEFAULT_INDEX_KEY } from '../../../../common/constants';
import { HostsEdges, PageInfoPaginated } from '../../../graphql/types';
import { inputsModel, State } from '../../../common/store';
import { createFilter } from '../../../common/containers/helpers';
import { useKibana } from '../../../common/lib/kibana';
import { hostsModel, hostsSelectors } from '../../store';
import { generateTablePaginationOptions } from '../../../common/components/paginated_table/helpers';
import {
  DocValueFields,
  HostsQueries,
  HostsRequestOptions,
  HostsStrategyResponse,
} from '../../../../common/search_strategy/security_solution';
import { ESTermQuery } from '../../../../common/typed_json';

import * as i18n from './translations';
import { AbortError } from '../../../../../../../src/plugins/data/common';

const ID = 'hostsQuery';

type LoadPage = (newActivePage: number) => void;
export interface HostsArgs {
  endDate: string;
  hosts: HostsEdges[];
  id: string;
  inspect: inputsModel.InspectQuery;
  isInspected: boolean;
  loadPage: LoadPage;
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  startDate: string;
  totalCount: number;
}

interface UseAllHost {
  docValueFields?: DocValueFields[];
  filterQuery?: ESTermQuery | string;
  endDate: string;
  startDate: string;
  type: hostsModel.HostsType;
}

export const useAllHost = ({
  docValueFields,
  filterQuery,
  endDate,
  startDate,
  type,
}: UseAllHost): [boolean, HostsArgs] => {
  const getHostsSelector = hostsSelectors.hostsSelector();
  const { activePage, direction, limit, sortField } = useSelector((state: State) =>
    getHostsSelector(state, type)
  );
  const { data, notifications, uiSettings } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const defaultIndex = uiSettings.get<string[]>(DEFAULT_INDEX_KEY);
  const [loading, setLoading] = useState(false);
  const [hostsRequest, setHostRequest] = useState<HostsRequestOptions>({
    defaultIndex,
    docValueFields: docValueFields ?? [],
    factoryQueryType: HostsQueries.hosts,
    filterQuery: createFilter(filterQuery),
    pagination: generateTablePaginationOptions(activePage, limit),
    timerange: {
      interval: '12h',
      from: startDate,
      to: endDate,
    },
    sort: {
      direction,
      field: sortField,
    },
    // inspect: isInspected,
  });

  const wrappedLoadMore = useCallback(
    (newActivePage: number) => {
      setHostRequest((prevRequest) => {
        return {
          ...prevRequest,
          pagination: generateTablePaginationOptions(newActivePage, limit),
        };
      });
    },
    [limit]
  );

  const [hostsResponse, setHostsResponse] = useState<HostsArgs>({
    endDate,
    hosts: [],
    id: ID,
    inspect: {
      dsl: [],
      response: [],
    },
    isInspected: false,
    loadPage: wrappedLoadMore,
    pageInfo: {
      activePage: 0,
      fakeTotalCount: 0,
      showMorePagesIndicator: false,
    },
    refetch: refetch.current,
    startDate,
    totalCount: -1,
  });

  const hostsSearch = useCallback(
    (request: HostsRequestOptions) => {
      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        const searchSubscription$ = data.search
          .search<HostsRequestOptions, HostsStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            signal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (!response.isPartial && !response.isRunning) {
                if (!didCancel) {
                  setLoading(false);
                  setHostsResponse((prevResponse) => ({
                    ...prevResponse,
                    hosts: response.edges,
                    inspect: response.inspect ?? prevResponse.inspect,
                    pageInfo: response.pageInfo,
                    refetch: refetch.current,
                    totalCount: response.totalCount,
                  }));
                }
                searchSubscription$.unsubscribe();
              } else if (response.isPartial && !response.isRunning) {
                if (!didCancel) {
                  setLoading(false);
                }
                // TODO: Make response error status clearer
                notifications.toasts.addWarning(i18n.ERROR_ALL_HOST);
                searchSubscription$.unsubscribe();
              }
            },
            error: (msg) => {
              if (!(msg instanceof AbortError)) {
                notifications.toasts.addDanger({ title: i18n.FAIL_ALL_HOST, text: msg.message });
              }
            },
          });
      };
      abortCtrl.current.abort();
      asyncSearch();
      refetch.current = asyncSearch;
      return () => {
        didCancel = true;
        abortCtrl.current.abort();
      };
    },
    [data.search, notifications.toasts]
  );

  useEffect(() => {
    setHostRequest((prevRequest) => {
      const myRequest = {
        ...prevRequest,
        defaultIndex,
        docValueFields: docValueFields ?? [],
        filterQuery: createFilter(filterQuery),
        pagination: generateTablePaginationOptions(activePage, limit),
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
        },
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
  }, [
    activePage,
    defaultIndex,
    direction,
    docValueFields,
    endDate,
    filterQuery,
    limit,
    startDate,
    sortField,
  ]);

  useEffect(() => {
    hostsSearch(hostsRequest);
  }, [hostsRequest, hostsSearch]);

  return [loading, hostsResponse];
};
