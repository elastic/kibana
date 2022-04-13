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

import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { inputsModel } from '../../../../common/store';
import { createFilter } from '../../../../common/containers/helpers';
import { useKibana } from '../../../../common/lib/kibana';
import {
  HostsKpiQueries,
  HostsKpiAuthenticationsRequestOptions,
  HostsKpiAuthenticationsStrategyResponse,
} from '../../../../../common/search_strategy';
import { ESTermQuery } from '../../../../../common/typed_json';

import * as i18n from './translations';
import { getInspectResponse } from '../../../../helpers';
import { InspectResponse } from '../../../../types';

export const ID = 'hostsKpiAuthenticationsQuery';

export interface HostsKpiAuthenticationsArgs
  extends Omit<HostsKpiAuthenticationsStrategyResponse, 'rawResponse'> {
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  refetch: inputsModel.Refetch;
}

interface UseHostsKpiAuthentications {
  filterQuery?: ESTermQuery | string;
  endDate: string;
  indexNames: string[];
  skip?: boolean;
  startDate: string;
}

export const useHostsKpiAuthentications = ({
  filterQuery,
  endDate,
  indexNames,
  skip = false,
  startDate,
}: UseHostsKpiAuthentications): [boolean, HostsKpiAuthenticationsArgs] => {
  const { data } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  const [loading, setLoading] = useState(false);
  const [hostsKpiAuthenticationsRequest, setHostsKpiAuthenticationsRequest] =
    useState<HostsKpiAuthenticationsRequestOptions | null>(null);

  const [hostsKpiAuthenticationsResponse, setHostsKpiAuthenticationsResponse] =
    useState<HostsKpiAuthenticationsArgs>({
      authenticationsSuccess: 0,
      authenticationsSuccessHistogram: [],
      authenticationsFailure: 0,
      authenticationsFailureHistogram: [],
      id: ID,
      inspect: {
        dsl: [],
        response: [],
      },
      isInspected: false,
      refetch: refetch.current,
    });
  const { addError, addWarning } = useAppToasts();

  const hostsKpiAuthenticationsSearch = useCallback(
    (request: HostsKpiAuthenticationsRequestOptions | null) => {
      if (request == null || skip) {
        return;
      }

      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        searchSubscription$.current = data.search
          .search<HostsKpiAuthenticationsRequestOptions, HostsKpiAuthenticationsStrategyResponse>(
            request,
            {
              strategy: 'securitySolutionSearchStrategy',
              abortSignal: abortCtrl.current.signal,
            }
          )
          .subscribe({
            next: (response) => {
              if (!response.isPartial && !response.isRunning) {
                setLoading(false);
                setHostsKpiAuthenticationsResponse((prevResponse) => ({
                  ...prevResponse,
                  authenticationsSuccess: response.authenticationsSuccess,
                  authenticationsSuccessHistogram: response.authenticationsSuccessHistogram,
                  authenticationsFailure: response.authenticationsFailure,
                  authenticationsFailureHistogram: response.authenticationsFailureHistogram,
                  inspect: getInspectResponse(response, prevResponse.inspect),
                  refetch: refetch.current,
                }));
                searchSubscription$.current.unsubscribe();
              } else if (response.isPartial && !response.isRunning) {
                setLoading(false);
                addWarning(i18n.ERROR_HOSTS_KPI_AUTHENTICATIONS);
                searchSubscription$.current.unsubscribe();
              }
            },
            error: (msg) => {
              setLoading(false);
              addError(msg, {
                title: i18n.FAIL_HOSTS_KPI_AUTHENTICATIONS,
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
    setHostsKpiAuthenticationsRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {}),
        defaultIndex: indexNames,
        factoryQueryType: HostsKpiQueries.kpiAuthentications,
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
    hostsKpiAuthenticationsSearch(hostsKpiAuthenticationsRequest);
    return () => {
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    };
  }, [hostsKpiAuthenticationsRequest, hostsKpiAuthenticationsSearch]);

  useEffect(() => {
    if (skip) {
      setLoading(false);
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    }
  }, [skip]);

  return [loading, hostsKpiAuthenticationsResponse];
};
