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

import { createFilter } from '../../../common/containers/helpers';
import { useKibana } from '../../../common/lib/kibana';
import {
  RiskScoreStrategyResponse,
  getHostRiskIndex,
  HostsRiskScore,
  UsersRiskScore,
  RiskScoreSortField,
  RiskScoreRequestOptions,
  RiskQueries,
  getUserRiskIndex,
} from '../../../../common/search_strategy';
import { ESQuery } from '../../../../common/typed_json';

import * as i18n from './translations';
import { isCompleteResponse, isErrorResponse } from '../../../../../../../src/plugins/data/common';
import { getInspectResponse } from '../../../helpers';
import { InspectResponse } from '../../../types';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { isIndexNotFoundError } from '../../../common/utils/exceptions';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { inputsModel } from '../../../common/store';
import { useSpaceId } from '../common';

export interface RiskScoreState<RiskScoreType extends HostsRiskScore[] | UsersRiskScore[]> {
  data?: RiskScoreType;
  inspect: InspectResponse;
  isInspected: boolean;
  refetch: inputsModel.Refetch;
  totalCount: number;
  isModuleEnabled: boolean | undefined;
}

interface UseRiskScore {
  sort?: RiskScoreSortField;
  filterQuery?: ESQuery | string;
  skip?: boolean;
  timerange?: { to: string; from: string };
  onlyLatest?: boolean;
  pagination?: RiskScoreRequestOptions['pagination'];
  featureEnabled: boolean;
  defaultIndex: string | undefined;
}

type UseHostRiskScore = Omit<UseRiskScore, 'featureEnabled' | 'defaultIndex'>;

type UseUserRiskScore = Omit<UseRiskScore, 'featureEnabled' | 'defaultIndex'>;

const isRecord = (item: unknown): item is Record<string, unknown> =>
  typeof item === 'object' && !!item;

export const isRiskScoreHit = (item: unknown): item is HostsRiskScore | UsersRiskScore =>
  isRecord(item) &&
  (isRecord(item.host) || isRecord(item.user)) &&
  isRecord(item.risk_stats) &&
  typeof item.risk_stats?.risk_score === 'number' &&
  typeof item.risk === 'string';

export const useHostRiskScore = ({
  timerange,
  onlyLatest,
  filterQuery,
  sort,
  skip = false,
  pagination,
}: UseHostRiskScore): [boolean, RiskScoreState<HostsRiskScore[]>] => {
  const spaceId = useSpaceId();
  const defaultIndex = spaceId ? getHostRiskIndex(spaceId, onlyLatest) : undefined;

  const riskyHostsFeatureEnabled = useIsExperimentalFeatureEnabled('riskyHostsEnabled');
  return useRiskScore<HostsRiskScore[]>({
    timerange,
    onlyLatest,
    filterQuery,
    sort,
    skip,
    pagination,
    featureEnabled: riskyHostsFeatureEnabled,
    defaultIndex,
  });
};

export const useUserRiskScore = ({
  timerange,
  onlyLatest,
  filterQuery,
  sort,
  skip = false,
  pagination,
}: UseUserRiskScore): [boolean, RiskScoreState<UsersRiskScore[]>] => {
  const spaceId = useSpaceId();
  const defaultIndex = spaceId ? getUserRiskIndex(spaceId, onlyLatest) : undefined;

  const usersFeatureEnabled = useIsExperimentalFeatureEnabled('usersEnabled');
  return useRiskScore<UsersRiskScore[]>({
    timerange,
    onlyLatest,
    filterQuery,
    sort,
    skip,
    pagination,
    featureEnabled: usersFeatureEnabled,
    defaultIndex,
  });
};

export const useRiskScore = <RiskScoreType extends HostsRiskScore[] | UsersRiskScore[]>({
  timerange,
  onlyLatest = true,
  filterQuery,
  sort,
  skip = false,
  pagination,
  featureEnabled,
  defaultIndex,
}: UseRiskScore): [boolean, RiskScoreState<RiskScoreType>] => {
  const { querySize, cursorStart } = pagination || {};
  const { data } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription = useRef(new Subscription());

  const [loading, setLoading] = useState<boolean>(featureEnabled);
  const [riskScoreRequest, setRiskScoreRequest] = useState<RiskScoreRequestOptions | null>(null);
  const { addError, addWarning } = useAppToasts();

  const [riskScoreResponse, setRiskScoreResponse] = useState<RiskScoreState<RiskScoreType>>({
    data: undefined,
    inspect: {
      dsl: [],
      response: [],
    },
    isInspected: false,
    refetch: refetch.current,
    totalCount: 0,
    isModuleEnabled: undefined,
  });

  const riskScoreSearch = useCallback(
    (request: RiskScoreRequestOptions | null) => {
      if (request == null || skip) {
        return;
      }

      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        searchSubscription.current = data.search
          .search<RiskScoreRequestOptions, RiskScoreStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                const hits = response?.rawResponse?.hits?.hits;

                setRiskScoreResponse((prevResponse) => ({
                  ...prevResponse,
                  data: isRiskScoreHit(hits?.[0]?._source)
                    ? (hits?.map((hit) => hit._source) as RiskScoreType)
                    : ([] as unknown as RiskScoreType),
                  inspect: getInspectResponse(response, prevResponse.inspect),
                  refetch: refetch.current,
                  totalCount: response.totalCount,
                  isModuleEnabled: true,
                }));
                searchSubscription.current.unsubscribe();
                setLoading(false);
              } else if (isErrorResponse(response)) {
                setLoading(false);
                addWarning(i18n.ERROR_RISK_SCORE);
                searchSubscription.current.unsubscribe();
              }
            },
            error: (error) => {
              setLoading(false);
              if (isIndexNotFoundError(error)) {
                setRiskScoreResponse((prevResponse) =>
                  !prevResponse
                    ? prevResponse
                    : {
                        ...prevResponse,
                        isModuleEnabled: false,
                      }
                );

                setLoading(false);
              } else {
                addError(error, { title: i18n.FAIL_RISK_SCORE });
              }

              searchSubscription.current.unsubscribe();
            },
          });
      };
      searchSubscription.current.unsubscribe();
      abortCtrl.current.abort();
      if (featureEnabled) {
        asyncSearch();
      }

      refetch.current = asyncSearch;
    },
    [data.search, addError, addWarning, skip, featureEnabled]
  );

  useEffect(() => {
    if (defaultIndex) {
      setRiskScoreRequest((prevRequest) => {
        const myRequest = {
          ...(prevRequest ?? {}),
          defaultIndex: [defaultIndex],
          factoryQueryType: RiskQueries.riskScore,
          filterQuery: createFilter(filterQuery),
          pagination:
            cursorStart !== undefined && querySize !== undefined
              ? {
                  cursorStart,
                  querySize,
                }
              : undefined,
          timerange: timerange
            ? { to: timerange.to, from: timerange.from, interval: '' }
            : undefined,
          sort,
        };

        if (!deepEqual(prevRequest, myRequest)) {
          return myRequest;
        }
        return prevRequest;
      });
    }
  }, [filterQuery, onlyLatest, timerange, cursorStart, querySize, sort, defaultIndex]);

  useEffect(() => {
    riskScoreSearch(riskScoreRequest);
    return () => {
      searchSubscription.current.unsubscribe();
      abortCtrl.current.abort();
    };
  }, [riskScoreRequest, riskScoreSearch]);

  useEffect(() => {
    if (skip) {
      setLoading(false);
      searchSubscription.current.unsubscribe();
      abortCtrl.current.abort();
    }
  }, [skip]);

  return [loading, riskScoreResponse];
};
