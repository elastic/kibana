/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import deepEqual from 'fast-deep-equal';

import { DEFAULT_INDEX_KEY } from '../../../../common/constants';
import {
  HostsQueries,
  HostOverviewRequestOptions,
  HostOverviewStrategyResponse,
} from '../../../../common/search_strategy/security_solution';
import { useKibana } from '../../../common/lib/kibana';
import { inputsModel } from '../../../common/store/inputs';
import { createFilter } from '../../../common/containers/helpers';
import { ESQuery } from '../../../../common/typed_json';
import { useManageSource } from '../../../common/containers/sourcerer';
import { SOURCERER_FEATURE_FLAG_ON } from '../../../common/containers/sourcerer/constants';
import { AbortError } from '../../../../../../../src/plugins/data/common';
import { getInspectResponse } from '../../../helpers';
import { InspectResponse } from '../../../types';
import * as i18n from './translations';

export const ID = 'overviewHostQuery';

export interface HostOverviewArgs {
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  overviewHost: HostOverviewStrategyResponse['overviewHost'];
  refetch: inputsModel.Refetch;
}

interface UseHostOverview {
  filterQuery?: ESQuery | string;
  endDate: string;
  skip?: boolean;
  startDate: string;
}

export const useHostOverview = ({
  filterQuery,
  endDate,
  skip = false,
  startDate,
}: UseHostOverview): [boolean, HostOverviewArgs] => {
  const { data, notifications, uiSettings } = useKibana().services;
  const { activeSourceGroupId, getManageSourceGroupById } = useManageSource();
  const { indexPatterns } = useMemo(() => getManageSourceGroupById(activeSourceGroupId), [
    getManageSourceGroupById,
    activeSourceGroupId,
  ]);
  const uiDefaultIndexPatterns = uiSettings.get<string[]>(DEFAULT_INDEX_KEY);
  const defaultIndex = SOURCERER_FEATURE_FLAG_ON ? indexPatterns : uiDefaultIndexPatterns;

  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const [loading, setLoading] = useState(false);
  const [overviewHostRequest, setHostRequest] = useState<HostOverviewRequestOptions>({
    defaultIndex,
    factoryQueryType: HostsQueries.overview,
    filterQuery: createFilter(filterQuery),
    timerange: {
      interval: '12h',
      from: startDate,
      to: endDate,
    },
  });

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
    (request: HostOverviewRequestOptions) => {
      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        const searchSubscription$ = data.search
          .search<HostOverviewRequestOptions, HostOverviewStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (!response.isPartial && !response.isRunning) {
                if (!didCancel) {
                  setLoading(false);
                  setHostOverviewResponse((prevResponse) => ({
                    ...prevResponse,
                    overviewHost: response.overviewHost,
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
    setHostRequest((prevRequest) => {
      const myRequest = {
        ...prevRequest,
        defaultIndex,
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
  }, [defaultIndex, endDate, filterQuery, skip, startDate]);

  useEffect(() => {
    overviewHostSearch(overviewHostRequest);
  }, [overviewHostRequest, overviewHostSearch]);

  return [loading, overviewHostResponse];
};
