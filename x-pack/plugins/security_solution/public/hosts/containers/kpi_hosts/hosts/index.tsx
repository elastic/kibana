/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import { noop } from 'lodash/fp';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Subscription } from 'rxjs';

import { useTransforms } from '../../../../transforms/containers/use_transforms';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { inputsModel } from '../../../../common/store';
import { createFilter } from '../../../../common/containers/helpers';
import { useKibana } from '../../../../common/lib/kibana';
import {
  HostsKpiQueries,
  HostsKpiHostsRequestOptions,
  HostsKpiHostsStrategyResponse,
} from '../../../../../common/search_strategy';
import { ESTermQuery } from '../../../../../common/typed_json';

import * as i18n from './translations';
import { getInspectResponse } from '../../../../helpers';
import { InspectResponse } from '../../../../types';

export const ID = 'hostsKpiHostsQuery';

export interface HostsKpiHostsArgs extends Omit<HostsKpiHostsStrategyResponse, 'rawResponse'> {
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  refetch: inputsModel.Refetch;
}

interface UseHostsKpiHosts {
  filterQuery?: ESTermQuery | string;
  endDate: string;
  indexNames: string[];
  skip?: boolean;
  startDate: string;
}

export const useHostsKpiHosts = ({
  filterQuery,
  endDate,
  indexNames,
  skip = false,
  startDate,
}: UseHostsKpiHosts): [boolean, HostsKpiHostsArgs] => {
  const { data } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  const [loading, setLoading] = useState(false);
  const [hostsKpiHostsRequest, setHostsKpiHostsRequest] =
    useState<HostsKpiHostsRequestOptions | null>(null);
  const { getTransformChangesIfTheyExist } = useTransforms();

  const [hostsKpiHostsResponse, setHostsKpiHostsResponse] = useState<HostsKpiHostsArgs>({
    hosts: 0,
    hostsHistogram: [],
    id: ID,
    inspect: {
      dsl: [],
      response: [],
    },
    isInspected: false,
    refetch: refetch.current,
  });
  const { addError, addWarning } = useAppToasts();

  const hostsKpiHostsSearch = useCallback(
    (request: HostsKpiHostsRequestOptions | null) => {
      if (request == null || skip) {
        return;
      }
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        searchSubscription$.current = data.search
          .search<HostsKpiHostsRequestOptions, HostsKpiHostsStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (!response.isPartial && !response.isRunning) {
                setLoading(false);
                setHostsKpiHostsResponse((prevResponse) => ({
                  ...prevResponse,
                  hosts: response.hosts,
                  hostsHistogram: response.hostsHistogram,
                  inspect: getInspectResponse(response, prevResponse.inspect),
                  refetch: refetch.current,
                }));
                searchSubscription$.current.unsubscribe();
              } else if (response.isPartial && !response.isRunning) {
                setLoading(false);
                addWarning(i18n.ERROR_HOSTS_KPI_HOSTS);
                searchSubscription$.current.unsubscribe();
              }
            },
            error: (msg) => {
              setLoading(false);
              addError(msg, {
                title: i18n.FAIL_HOSTS_KPI_HOSTS,
              });
              searchSubscription$.current.unsubscribe();
            },
          });
      };
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
      asyncSearch();
      refetch.current = asyncSearch;
    },
    [data.search, addError, addWarning, skip]
  );

  useEffect(() => {
    setHostsKpiHostsRequest((prevRequest) => {
      const { indices, factoryQueryType, timerange } = getTransformChangesIfTheyExist({
        factoryQueryType: HostsKpiQueries.kpiHosts,
        indices: indexNames,
        filterQuery,
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
        },
      });
      const myRequest = {
        ...(prevRequest ?? {}),
        defaultIndex: indices,
        factoryQueryType,
        filterQuery: createFilter(filterQuery),
        timerange,
      };
      if (!deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [indexNames, endDate, filterQuery, startDate, getTransformChangesIfTheyExist]);

  useEffect(() => {
    hostsKpiHostsSearch(hostsKpiHostsRequest);
    return () => {
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    };
  }, [hostsKpiHostsRequest, hostsKpiHostsSearch]);

  useEffect(() => {
    if (skip) {
      setLoading(false);
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    }
  }, [skip]);

  return [loading, hostsKpiHostsResponse];
};
