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
  NetworkKpiHistogramData,
  NetworkKpiQueries,
  NetworkKpiUniquePrivateIpsRequestOptions,
  NetworkKpiUniquePrivateIpsStrategyResponse,
} from '../../../../../common/search_strategy';
import { ESTermQuery } from '../../../../../common/typed_json';

import * as i18n from './translations';
import {
  isCompleteResponse,
  isErrorResponse,
} from '../../../../../../../../src/plugins/data/common';
import { AbortError } from '../../../../../../../../src/plugins/kibana_utils/common';
import { getInspectResponse } from '../../../../helpers';
import { InspectResponse } from '../../../../types';

const ID = 'networkKpiUniquePrivateIpsQuery';

export interface NetworkKpiUniquePrivateIpsArgs {
  uniqueDestinationPrivateIps: number;
  uniqueDestinationPrivateIpsHistogram: NetworkKpiHistogramData[] | null;
  uniqueSourcePrivateIps: number;
  uniqueSourcePrivateIpsHistogram: NetworkKpiHistogramData[] | null;
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  refetch: inputsModel.Refetch;
}

interface UseNetworkKpiUniquePrivateIps {
  filterQuery?: ESTermQuery | string;
  endDate: string;
  indexNames: string[];
  skip?: boolean;
  startDate: string;
}

export const useNetworkKpiUniquePrivateIps = ({
  filterQuery,
  endDate,
  indexNames,
  skip = false,
  startDate,
}: UseNetworkKpiUniquePrivateIps): [boolean, NetworkKpiUniquePrivateIpsArgs] => {
  const { data, notifications } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const [loading, setLoading] = useState(false);
  const [
    networkKpiUniquePrivateIpsRequest,
    setNetworkKpiUniquePrivateIpsRequest,
  ] = useState<NetworkKpiUniquePrivateIpsRequestOptions | null>(null);

  const [
    networkKpiUniquePrivateIpsResponse,
    setNetworkKpiUniquePrivateIpsResponse,
  ] = useState<NetworkKpiUniquePrivateIpsArgs>({
    uniqueDestinationPrivateIps: 0,
    uniqueDestinationPrivateIpsHistogram: null,
    uniqueSourcePrivateIps: 0,
    uniqueSourcePrivateIpsHistogram: null,
    id: ID,
    inspect: {
      dsl: [],
      response: [],
    },
    isInspected: false,
    refetch: refetch.current,
  });

  const networkKpiUniquePrivateIpsSearch = useCallback(
    (request: NetworkKpiUniquePrivateIpsRequestOptions | null) => {
      if (request == null || skip) {
        return;
      }

      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        const searchSubscription$ = data.search
          .search<
            NetworkKpiUniquePrivateIpsRequestOptions,
            NetworkKpiUniquePrivateIpsStrategyResponse
          >(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                if (!didCancel) {
                  setLoading(false);
                  setNetworkKpiUniquePrivateIpsResponse((prevResponse) => ({
                    ...prevResponse,
                    uniqueDestinationPrivateIps: response.uniqueDestinationPrivateIps,
                    uniqueDestinationPrivateIpsHistogram:
                      response.uniqueDestinationPrivateIpsHistogram,
                    uniqueSourcePrivateIps: response.uniqueSourcePrivateIps,
                    uniqueSourcePrivateIpsHistogram: response.uniqueSourcePrivateIpsHistogram,
                    inspect: getInspectResponse(response, prevResponse.inspect),
                    refetch: refetch.current,
                  }));
                }
                searchSubscription$.unsubscribe();
              } else if (isErrorResponse(response)) {
                if (!didCancel) {
                  setLoading(false);
                }
                // TODO: Make response error status clearer
                notifications.toasts.addWarning(i18n.ERROR_NETWORK_KPI_UNIQUE_PRIVATE_IPS);
                searchSubscription$.unsubscribe();
              }
            },
            error: (msg) => {
              if (!(msg instanceof AbortError)) {
                notifications.toasts.addDanger({
                  title: i18n.FAIL_NETWORK_KPI_UNIQUE_PRIVATE_IPS,
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
    setNetworkKpiUniquePrivateIpsRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {}),
        defaultIndex: indexNames,
        factoryQueryType: NetworkKpiQueries.uniquePrivateIps,
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
    networkKpiUniquePrivateIpsSearch(networkKpiUniquePrivateIpsRequest);
  }, [networkKpiUniquePrivateIpsRequest, networkKpiUniquePrivateIpsSearch]);

  return [loading, networkKpiUniquePrivateIpsResponse];
};
