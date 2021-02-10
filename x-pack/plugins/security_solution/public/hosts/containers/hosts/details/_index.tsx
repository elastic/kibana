/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// REPLACE WHEN HOST ENDPOINT DATA IS AVAILABLE

import deepEqual from 'fast-deep-equal';
import { noop } from 'lodash/fp';
import { useCallback, useEffect, useRef, useState } from 'react';

import { inputsModel } from '../../../../common/store';
import { useKibana } from '../../../../common/lib/kibana';
import {
  HostItem,
  HostsQueries,
  HostDetailsRequestOptions,
  HostDetailsStrategyResponse,
} from '../../../../../common/search_strategy/security_solution/hosts';

import * as i18n from './translations';
import {
  isCompleteResponse,
  isErrorResponse,
} from '../../../../../../../../src/plugins/data/common';
import { AbortError } from '../../../../../../../../src/plugins/kibana_utils/common';
import { getInspectResponse } from '../../../../helpers';
import { InspectResponse } from '../../../../types';

const ID = 'hostsDetailsQuery';

export interface HostDetailsArgs {
  id: string;
  inspect: InspectResponse;
  hostDetails: HostItem;
  refetch: inputsModel.Refetch;
  startDate: string;
  endDate: string;
}

interface UseHostDetails {
  endDate: string;
  hostName: string;
  id?: string;
  indexNames: string[];
  skip?: boolean;
  startDate: string;
}

export const useHostDetails = ({
  endDate,
  hostName,
  indexNames,
  id = ID,
  skip = false,
  startDate,
}: UseHostDetails): [boolean, HostDetailsArgs] => {
  const { data, notifications } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const didCancel = useRef(false);
  const [loading, setLoading] = useState(false);
  const [hostDetailsRequest, setHostDetailsRequest] = useState<HostDetailsRequestOptions | null>(
    null
  );

  const [hostDetailsResponse, setHostDetailsResponse] = useState<HostDetailsArgs>({
    endDate,
    hostDetails: {},
    id,
    inspect: {
      dsl: [],
      response: [],
    },
    refetch: refetch.current,
    startDate,
  });

  const hostDetailsSearch = useCallback(
    (request: HostDetailsRequestOptions | null) => {
      if (request == null || skip) {
        return;
      }

      didCancel.current = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        const searchSubscription$ = data.search
          .search<HostDetailsRequestOptions, HostDetailsStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (!didCancel.current) {
                if (isCompleteResponse(response)) {
                  setLoading(false);
                  setHostDetailsResponse((prevResponse) => ({
                    ...prevResponse,
                    hostDetails: response.hostDetails,
                    inspect: getInspectResponse(response, prevResponse.inspect),
                    refetch: refetch.current,
                  }));
                  searchSubscription$.unsubscribe();
                } else if (isErrorResponse(response)) {
                  setLoading(false);
                  // TODO: Make response error status clearer
                  notifications.toasts.addWarning(i18n.ERROR_HOST_OVERVIEW);
                  searchSubscription$.unsubscribe();
                }
              } else {
                searchSubscription$.unsubscribe();
              }
            },
            error: (msg) => {
              if (!didCancel.current) {
                if (!(msg instanceof AbortError)) {
                  setLoading(false);
                  notifications.toasts.addDanger({
                    title: i18n.FAIL_HOST_OVERVIEW,
                    text: msg.message,
                  });
                }
              }
              searchSubscription$.unsubscribe();
            },
          });
      };
      abortCtrl.current.abort();
      asyncSearch();
      refetch.current = asyncSearch;
    },
    [data.search, notifications.toasts, skip]
  );

  useEffect(() => {
    setHostDetailsRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {}),
        defaultIndex: indexNames,
        factoryQueryType: HostsQueries.details,
        hostName,
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
    return () => {
      didCancel.current = true;
      abortCtrl.current.abort();
    };
  }, [endDate, hostName, indexNames, startDate]);

  useEffect(() => {
    hostDetailsSearch(hostDetailsRequest);
  }, [hostDetailsRequest, hostDetailsSearch]);

  return [loading, hostDetailsResponse];
};
