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
  HostsKpiAuthenticationsRequestOptions,
  HostsKpiAuthenticationsStrategyResponse,
} from '../../../../../common/search_strategy';
import { ESTermQuery } from '../../../../../common/typed_json';

import * as i18n from './translations';
import { AbortError } from '../../../../../../../../src/plugins/data/common';
import { getInspectResponse } from '../../../../helpers';
import { InspectResponse } from '../../../../types';

const ID = 'hostsKpiAuthenticationsQuery';

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
  const { data, notifications } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const [loading, setLoading] = useState(false);
  const [
    hostsKpiAuthenticationsRequest,
    setHostsKpiAuthenticationsRequest,
  ] = useState<HostsKpiAuthenticationsRequestOptions | null>(
    !skip
      ? {
          defaultIndex: indexNames,
          factoryQueryType: HostsKpiQueries.kpiAuthentications,
          filterQuery: createFilter(filterQuery),
          timerange: {
            interval: '12h',
            from: startDate,
            to: endDate,
          },
        }
      : null
  );

  const [hostsKpiAuthenticationsResponse, setHostsKpiAuthenticationsResponse] = useState<
    HostsKpiAuthenticationsArgs
  >({
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

  const hostsKpiAuthenticationsSearch = useCallback(
    (request: HostsKpiAuthenticationsRequestOptions | null) => {
      if (request == null) {
        return;
      }

      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        const searchSubscription$ = data.search
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
                if (!didCancel) {
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
                }
                searchSubscription$.unsubscribe();
              } else if (response.isPartial && !response.isRunning) {
                if (!didCancel) {
                  setLoading(false);
                }
                // TODO: Make response error status clearer
                notifications.toasts.addWarning(i18n.ERROR_HOSTS_KPI_AUTHENTICATIONS);
                searchSubscription$.unsubscribe();
              }
            },
            error: (msg) => {
              if (!(msg instanceof AbortError)) {
                notifications.toasts.addDanger({
                  title: i18n.FAIL_HOSTS_KPI_AUTHENTICATIONS,
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
    [data.search, notifications.toasts]
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
      if (!skip && !deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [indexNames, endDate, filterQuery, skip, startDate]);

  useEffect(() => {
    hostsKpiAuthenticationsSearch(hostsKpiAuthenticationsRequest);
  }, [hostsKpiAuthenticationsRequest, hostsKpiAuthenticationsSearch]);

  return [loading, hostsKpiAuthenticationsResponse];
};
