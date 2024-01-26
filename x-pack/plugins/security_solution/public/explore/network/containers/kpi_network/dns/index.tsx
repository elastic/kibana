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

import { isRunningResponse } from '@kbn/data-plugin/common';
import type { NetworkKpiDnsRequestOptionsInput } from '../../../../../../common/api/search_strategy';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import type { inputsModel } from '../../../../../common/store';
import { createFilter } from '../../../../../common/containers/helpers';
import { useKibana } from '../../../../../common/lib/kibana';
import type { NetworkKpiDnsStrategyResponse } from '../../../../../../common/search_strategy';
import { NetworkKpiQueries } from '../../../../../../common/search_strategy';
import type { ESTermQuery } from '../../../../../../common/typed_json';

import * as i18n from './translations';
import { getInspectResponse } from '../../../../../helpers';
import type { InspectResponse } from '../../../../../types';

export const ID = 'networkKpiDnsQuery';

export interface NetworkKpiDnsArgs {
  dnsQueries: number;
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  refetch: inputsModel.Refetch;
}

interface UseNetworkKpiDns {
  filterQuery?: ESTermQuery | string;
  endDate: string;
  indexNames: string[];
  skip?: boolean;
  startDate: string;
}

export const useNetworkKpiDns = ({
  filterQuery,
  endDate,
  indexNames,
  skip = false,
  startDate,
}: UseNetworkKpiDns): [boolean, NetworkKpiDnsArgs] => {
  const { data } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  const [loading, setLoading] = useState(false);
  const [networkKpiDnsRequest, setNetworkKpiDnsRequest] =
    useState<NetworkKpiDnsRequestOptionsInput | null>(null);

  const [networkKpiDnsResponse, setNetworkKpiDnsResponse] = useState<NetworkKpiDnsArgs>({
    dnsQueries: 0,
    id: ID,
    inspect: {
      dsl: [],
      response: [],
    },
    isInspected: false,
    refetch: refetch.current,
  });
  const { addError } = useAppToasts();

  const networkKpiDnsSearch = useCallback(
    (request: NetworkKpiDnsRequestOptionsInput | null) => {
      if (request == null || skip) {
        return;
      }

      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        searchSubscription$.current = data.search
          .search<NetworkKpiDnsRequestOptionsInput, NetworkKpiDnsStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (!isRunningResponse(response)) {
                setLoading(false);
                setNetworkKpiDnsResponse((prevResponse) => ({
                  ...prevResponse,
                  dnsQueries: response.dnsQueries,
                  inspect: getInspectResponse(response, prevResponse.inspect),
                  refetch: refetch.current,
                }));
                searchSubscription$.current.unsubscribe();
              }
            },
            error: (msg) => {
              setLoading(false);
              addError(msg, {
                title: i18n.FAIL_NETWORK_KPI_DNS,
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
    [data.search, addError, skip]
  );

  useEffect(() => {
    setNetworkKpiDnsRequest((prevRequest) => {
      const myRequest: NetworkKpiDnsRequestOptionsInput = {
        ...(prevRequest ?? {}),
        defaultIndex: indexNames,
        factoryQueryType: NetworkKpiQueries.dns,
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
    networkKpiDnsSearch(networkKpiDnsRequest);
    return () => {
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    };
  }, [networkKpiDnsRequest, networkKpiDnsSearch]);

  useEffect(() => {
    if (skip) {
      setLoading(false);
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    }
  }, [skip]);

  return [loading, networkKpiDnsResponse];
};
