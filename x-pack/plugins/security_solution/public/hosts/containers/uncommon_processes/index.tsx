/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import { noop } from 'lodash/fp';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { isCompleteResponse, isErrorResponse } from '../../../../../../../src/plugins/data/common';
import { AbortError } from '../../../../../../../src/plugins/kibana_utils/common';

import { inputsModel, State } from '../../../common/store';
import { useKibana } from '../../../common/lib/kibana';
import { generateTablePaginationOptions } from '../../../common/components/paginated_table/helpers';
import { createFilter } from '../../../common/containers/helpers';
import { hostsModel, hostsSelectors } from '../../store';
import {
  DocValueFields,
  SortField,
  PageInfoPaginated,
  HostsUncommonProcessesEdges,
  HostsQueries,
  HostsUncommonProcessesRequestOptions,
  HostsUncommonProcessesStrategyResponse,
} from '../../../../common/search_strategy';

import * as i18n from './translations';
import { ESTermQuery } from '../../../../common/typed_json';
import { getInspectResponse } from '../../../helpers';
import { InspectResponse } from '../../../types';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';

const ID = 'hostsUncommonProcessesQuery';

export interface UncommonProcessesArgs {
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  loadPage: (newActivePage: number) => void;
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  totalCount: number;
  uncommonProcesses: HostsUncommonProcessesEdges[];
}

interface UseUncommonProcesses {
  docValueFields?: DocValueFields[];
  filterQuery?: ESTermQuery | string;
  endDate: string;
  indexNames: string[];
  skip?: boolean;
  startDate: string;
  type: hostsModel.HostsType;
}

export const useUncommonProcesses = ({
  docValueFields,
  filterQuery,
  endDate,
  indexNames,
  skip = false,
  startDate,
  type,
}: UseUncommonProcesses): [boolean, UncommonProcessesArgs] => {
  const getUncommonProcessesSelector = useMemo(
    () => hostsSelectors.uncommonProcessesSelector(),
    []
  );
  const { activePage, limit } = useDeepEqualSelector((state: State) =>
    getUncommonProcessesSelector(state, type)
  );
  const { data, notifications } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const [loading, setLoading] = useState(false);
  const [
    uncommonProcessesRequest,
    setUncommonProcessesRequest,
  ] = useState<HostsUncommonProcessesRequestOptions | null>(null);

  const wrappedLoadMore = useCallback(
    (newActivePage: number) => {
      setUncommonProcessesRequest((prevRequest) => {
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

  const [uncommonProcessesResponse, setUncommonProcessesResponse] = useState<UncommonProcessesArgs>(
    {
      uncommonProcesses: [],
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
      totalCount: -1,
    }
  );

  const uncommonProcessesSearch = useCallback(
    (request: HostsUncommonProcessesRequestOptions | null) => {
      if (request == null || skip) {
        return;
      }

      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        const searchSubscription$ = data.search
          .search<HostsUncommonProcessesRequestOptions, HostsUncommonProcessesStrategyResponse>(
            request,
            {
              strategy: 'securitySolutionSearchStrategy',
              abortSignal: abortCtrl.current.signal,
            }
          )
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                if (!didCancel) {
                  setLoading(false);
                  setUncommonProcessesResponse((prevResponse) => ({
                    ...prevResponse,
                    uncommonProcesses: response.edges,
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
                notifications.toasts.addWarning(i18n.ERROR_UNCOMMON_PROCESSES);
                searchSubscription$.unsubscribe();
              }
            },
            error: (msg) => {
              if (!(msg instanceof AbortError)) {
                notifications.toasts.addDanger({
                  title: i18n.FAIL_UNCOMMON_PROCESSES,
                  text: msg.message,
                });
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
    setUncommonProcessesRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {}),
        defaultIndex: indexNames,
        docValueFields: docValueFields ?? [],
        factoryQueryType: HostsQueries.uncommonProcesses,
        filterQuery: createFilter(filterQuery),
        pagination: generateTablePaginationOptions(activePage, limit),
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
        },
        sort: {} as SortField,
      };
      if (!deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [activePage, indexNames, docValueFields, endDate, filterQuery, limit, startDate]);

  useEffect(() => {
    uncommonProcessesSearch(uncommonProcessesRequest);
  }, [uncommonProcessesRequest, uncommonProcessesSearch]);

  return [loading, uncommonProcessesResponse];
};
