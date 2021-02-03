/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import deepEqual from 'fast-deep-equal';
import { noop } from 'lodash/fp';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { inputsModel, State } from '../../../common/store';
import { createFilter } from '../../../common/containers/helpers';
import { useKibana } from '../../../common/lib/kibana';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { hostsModel, hostsSelectors } from '../../store';
import { generateTablePaginationOptions } from '../../../common/components/paginated_table/helpers';
import {
  HostsEdges,
  PageInfoPaginated,
  DocValueFields,
  HostsQueries,
  HostsRequestOptions,
  HostsStrategyResponse,
} from '../../../../common/search_strategy';
import { ESTermQuery } from '../../../../common/typed_json';

import * as i18n from './translations';
import { isCompleteResponse, isErrorResponse } from '../../../../../../../src/plugins/data/common';
import { AbortError } from '../../../../../../../src/plugins/kibana_utils/common';
import { getInspectResponse } from '../../../helpers';
import { InspectResponse } from '../../../types';

const ID = 'hostsAllQuery';

type LoadPage = (newActivePage: number) => void;
export interface HostsArgs {
  endDate: string;
  hosts: HostsEdges[];
  id: string;
  inspect: InspectResponse;
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
  indexNames: string[];
  skip?: boolean;
  startDate: string;
  type: hostsModel.HostsType;
}

export const useAllHost = ({
  docValueFields,
  filterQuery,
  endDate,
  indexNames,
  skip = false,
  startDate,
  type,
}: UseAllHost): [boolean, HostsArgs] => {
  const getHostsSelector = useMemo(() => hostsSelectors.hostsSelector(), []);
  const { activePage, direction, limit, sortField } = useDeepEqualSelector((state: State) =>
    getHostsSelector(state, type)
  );
  const { data, notifications } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const [loading, setLoading] = useState(false);
  const [hostsRequest, setHostRequest] = useState<HostsRequestOptions | null>(null);

  const wrappedLoadMore = useCallback(
    (newActivePage: number) => {
      setHostRequest((prevRequest) => {
        if (!prevRequest) {
          return prevRequest;
        }

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
    (request: HostsRequestOptions | null) => {
      if (request == null || skip) {
        return;
      }

      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        const searchSubscription$ = data.search
          .search<HostsRequestOptions, HostsStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                if (!didCancel) {
                  setLoading(false);
                  setHostsResponse((prevResponse) => ({
                    ...prevResponse,
                    hosts: response.edges,
                    inspect: getInspectResponse(response, prevResponse.inspect),
                    pageInfo: response.pageInfo,
                    refetch: refetch.current,
                    totalCount: response.totalCount,
                  }));
                }
                searchSubscription$.unsubscribe();
              } else if (isErrorResponse(response)) {
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
    [data.search, notifications.toasts, skip]
  );

  useEffect(() => {
    setHostRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {}),
        defaultIndex: indexNames,
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
      };
      if (!deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [
    activePage,
    direction,
    docValueFields,
    endDate,
    filterQuery,
    indexNames,
    limit,
    startDate,
    sortField,
  ]);

  useEffect(() => {
    hostsSearch(hostsRequest);
  }, [hostsRequest, hostsSearch]);

  return [loading, hostsResponse];
};
