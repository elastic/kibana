/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import deepEqual from 'fast-deep-equal';
import { noop } from 'lodash/fp';
import { useCallback, useEffect, useRef, useState } from 'react';

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
import { AbortError } from '../../../../../../../../src/plugins/kibana_utils/common';
import { getInspectResponse } from '../../../../helpers';
import { InspectResponse } from '../../../../types';

const ID = 'hostsKpiHostsQuery';

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
  const { data, notifications } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const [loading, setLoading] = useState(false);
  const [
    hostsKpiHostsRequest,
    setHostsKpiHostsRequest,
  ] = useState<HostsKpiHostsRequestOptions | null>(null);

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

  const hostsKpiHostsSearch = useCallback(
    (request: HostsKpiHostsRequestOptions | null) => {
      if (request == null || skip) {
        return;
      }

      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        const searchSubscription$ = data.search
          .search<HostsKpiHostsRequestOptions, HostsKpiHostsStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (!response.isPartial && !response.isRunning) {
                if (!didCancel) {
                  setLoading(false);
                  setHostsKpiHostsResponse((prevResponse) => ({
                    ...prevResponse,
                    hosts: response.hosts,
                    hostsHistogram: response.hostsHistogram,
                    inspect: getInspectResponse(response, prevResponse.inspect),
                    refetch: refetch.current,
                  }));
                }
                searchSubscription$.unsubscribe();
              } else if (response.isPartial && !response.isRunning) {
                if (!didCancel) {
                  setLoading(false);
                }
                // TODO: Make response error status clearer
                notifications.toasts.addWarning(i18n.ERROR_HOSTS_KPI_HOSTS);
                searchSubscription$.unsubscribe();
              }
            },
            error: (msg) => {
              if (!(msg instanceof AbortError)) {
                notifications.toasts.addDanger({
                  title: i18n.FAIL_HOSTS_KPI_HOSTS,
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
    setHostsKpiHostsRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {}),
        defaultIndex: indexNames,
        factoryQueryType: HostsKpiQueries.kpiHosts,
        filterQuery: createFilter(filterQuery),
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
        },
      };
      if (!deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [indexNames, endDate, filterQuery, startDate]);

  useEffect(() => {
    hostsKpiHostsSearch(hostsKpiHostsRequest);
  }, [hostsKpiHostsRequest, hostsKpiHostsSearch]);

  return [loading, hostsKpiHostsResponse];
};
