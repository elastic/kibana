/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// REPLACE WHEN HOST ENDPOINT DATA IS AVAILABLE

import deepEqual from 'fast-deep-equal';
// Prefer  importing entire lodash library, e.g. import { get } from "lodash"
// eslint-disable-next-line no-restricted-imports
import { noop } from 'lodash/fp';
import { useCallback, useEffect, useRef, useState } from 'react';

import { DEFAULT_INDEX_KEY } from '../../../../../common/constants';
import { inputsModel } from '../../../../common/store';
import { useKibana } from '../../../../common/lib/kibana';
import {
  HostItem,
  HostsQueries,
  HostDetailsRequestOptions,
  HostDetailsStrategyResponse,
} from '../../../../../common/search_strategy/security_solution/hosts';

import * as i18n from './translations';
import { AbortError } from '../../../../../../../../src/plugins/data/common';
import { getInspectResponse } from '../../../../helpers';
import { InspectResponse } from '../../../../types';

const ID = 'hostDetailsQuery';

export interface HostDetailsArgs {
  id: string;
  inspect: InspectResponse;
  hostDetails: HostItem;
  refetch: inputsModel.Refetch;
  startDate: string;
  endDate: string;
}

interface UseHostDetails {
  id?: string;
  hostName: string;
  endDate: string;
  skip?: boolean;
  startDate: string;
}

export const useHostDetails = ({
  endDate,
  hostName,
  skip = false,
  startDate,
  id = ID,
}: UseHostDetails): [boolean, HostDetailsArgs] => {
  const { data, notifications, uiSettings } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const defaultIndex = uiSettings.get<string[]>(DEFAULT_INDEX_KEY);
  const [loading, setLoading] = useState(false);
  const [hostDetailsRequest, setHostDetailsRequest] = useState<HostDetailsRequestOptions>({
    defaultIndex,
    hostName,
    factoryQueryType: HostsQueries.details,
    timerange: {
      interval: '12h',
      from: startDate,
      to: endDate,
    },
  });

  const [hostDetailsResponse, setHostDetailsResponse] = useState<HostDetailsArgs>({
    endDate,
    hostDetails: {},
    id: ID,
    inspect: {
      dsl: [],
      response: [],
    },
    refetch: refetch.current,
    startDate,
  });

  const hostDetailsSearch = useCallback(
    (request: HostDetailsRequestOptions) => {
      let didCancel = false;
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
              if (!response.isPartial && !response.isRunning) {
                if (!didCancel) {
                  setLoading(false);
                  setHostDetailsResponse((prevResponse) => ({
                    ...prevResponse,
                    hostDetails: response.hostDetails,
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
                notifications.toasts.addWarning(i18n.ERROR_HOST_OVERVIEW);
                searchSubscription$.unsubscribe();
              }
            },
            error: (msg) => {
              if (!(msg instanceof AbortError)) {
                notifications.toasts.addDanger({
                  title: i18n.FAIL_HOST_OVERVIEW,
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
    setHostDetailsRequest((prevRequest) => {
      const myRequest = {
        ...prevRequest,
        defaultIndex,
        hostName,
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
  }, [defaultIndex, endDate, hostName, startDate, skip]);

  useEffect(() => {
    hostDetailsSearch(hostDetailsRequest);
  }, [hostDetailsRequest, hostDetailsSearch]);

  return [loading, hostDetailsResponse];
};
