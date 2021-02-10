/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash/fp';
import { useCallback, useEffect, useRef, useState } from 'react';
import deepEqual from 'fast-deep-equal';

import {
  HostsQueries,
  HostOverviewRequestOptions,
  HostsOverviewStrategyResponse,
} from '../../../../common/search_strategy/security_solution';
import { useKibana } from '../../../common/lib/kibana';
import { inputsModel } from '../../../common/store/inputs';
import { createFilter } from '../../../common/containers/helpers';
import { ESQuery } from '../../../../common/typed_json';
import { isCompleteResponse, isErrorResponse } from '../../../../../../../src/plugins/data/common';
import { AbortError } from '../../../../../../../src/plugins/kibana_utils/common';
import { getInspectResponse } from '../../../helpers';
import { InspectResponse } from '../../../types';
import * as i18n from './translations';

export const ID = 'overviewHostQuery';

export interface HostOverviewArgs {
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  overviewHost: HostsOverviewStrategyResponse['overviewHost'];
  refetch: inputsModel.Refetch;
}

interface UseHostOverview {
  filterQuery?: ESQuery | string;
  endDate: string;
  indexNames: string[];
  skip?: boolean;
  startDate: string;
}

export const useHostOverview = ({
  filterQuery,
  endDate,
  indexNames,
  skip = false,
  startDate,
}: UseHostOverview): [boolean, HostOverviewArgs] => {
  const { data, notifications } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const didCancel = useRef(false);
  const [loading, setLoading] = useState(false);
  const [overviewHostRequest, setHostRequest] = useState<HostOverviewRequestOptions | null>(null);

  const [overviewHostResponse, setHostOverviewResponse] = useState<HostOverviewArgs>({
    overviewHost: {},
    id: ID,
    inspect: {
      dsl: [],
      response: [],
    },
    isInspected: false,
    refetch: refetch.current,
  });

  const overviewHostSearch = useCallback(
    (request: HostOverviewRequestOptions | null) => {
      if (request == null || skip) {
        return;
      }

      didCancel.current = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        const searchSubscription$ = data.search
          .search<HostOverviewRequestOptions, HostsOverviewStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (!didCancel.current) {
                if (isCompleteResponse(response)) {
                  setLoading(false);
                  setHostOverviewResponse((prevResponse) => ({
                    ...prevResponse,
                    overviewHost: response.overviewHost,
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
                setLoading(false);
                if (!(msg instanceof AbortError)) {
                  notifications.toasts.addDanger({
                    title: i18n.FAIL_HOST_OVERVIEW,
                    text: msg.message,
                  });
                }
              }
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
    setHostRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {}),
        defaultIndex: indexNames,
        factoryQueryType: HostsQueries.overview,
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
    overviewHostSearch(overviewHostRequest);
    return () => {
      didCancel.current = true;
      abortCtrl.current.abort();
    };
  }, [overviewHostRequest, overviewHostSearch]);

  return [loading, overviewHostResponse];
};
