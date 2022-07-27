/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';

import { createFilter } from '../../../common/containers/helpers';
import type {
  HostsRiskScore,
  UsersRiskScore,
  RiskScoreSortField,
} from '../../../../common/search_strategy';
import {
  getHostRiskIndex,
  RiskQueries,
  getUserRiskIndex,
} from '../../../../common/search_strategy';
import type { ESQuery } from '../../../../common/typed_json';

import * as i18n from './translations';
import type { InspectResponse } from '../../../types';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { isIndexNotFoundError } from '../../../common/utils/exceptions';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import type { inputsModel } from '../../../common/store';
import { useSpaceId } from '../common';
import { useSearchStrategy } from '../../../common/containers/use_search_strategy';

export interface RiskScoreState<T extends RiskQueries.hostsRiskScore | RiskQueries.usersRiskScore> {
  data?: T extends RiskQueries.hostsRiskScore
    ? HostsRiskScore[] | undefined
    : T extends RiskQueries.usersRiskScore
    ? UsersRiskScore[] | undefined
    : never;
  inspect: InspectResponse;
  isInspected: boolean;
  refetch: inputsModel.Refetch;
  totalCount: number;
  isModuleEnabled: boolean | undefined;
}

interface UseRiskScore<T> {
  defaultIndex: string | undefined;
  factoryQueryType: T;
  featureEnabled: boolean;
  filterQuery?: ESQuery | string;
  onlyLatest?: boolean;
  pagination?:
    | {
        cursorStart: number;
        querySize: number;
      }
    | undefined;
  skip?: boolean;
  sort?: RiskScoreSortField;
  timerange?: { to: string; from: string };
}

type UseHostRiskScore = Omit<
  UseRiskScore<RiskQueries.hostsRiskScore>,
  'featureEnabled' | 'defaultIndex'
>;

type UseUserRiskScore = Omit<
  UseRiskScore<RiskQueries.usersRiskScore>,
  'featureEnabled' | 'defaultIndex'
>;

export const useHostRiskScore = ({
  timerange,
  onlyLatest,
  filterQuery,
  sort,
  skip = false,
  pagination,
}: UseHostRiskScore) => {
  const spaceId = useSpaceId();
  const defaultIndex = spaceId ? getHostRiskIndex(spaceId, onlyLatest) : undefined;
  const riskyHostsFeatureEnabled = useIsExperimentalFeatureEnabled('riskyHostsEnabled');
  return useRiskScore({
    timerange,
    onlyLatest,
    filterQuery,
    sort,
    skip,
    pagination,
    featureEnabled: riskyHostsFeatureEnabled,
    defaultIndex,
    factoryQueryType: RiskQueries.hostsRiskScore,
  });
};

export const useUserRiskScore = ({
  timerange,
  onlyLatest,
  filterQuery,
  sort,
  skip = false,
  pagination,
}: UseUserRiskScore) => {
  const spaceId = useSpaceId();
  const defaultIndex = spaceId ? getUserRiskIndex(spaceId, onlyLatest) : undefined;

  const riskyUsersFeatureEnabled = useIsExperimentalFeatureEnabled('riskyUsersEnabled');
  return useRiskScore({
    timerange,
    onlyLatest,
    filterQuery,
    sort,
    skip,
    pagination,
    featureEnabled: riskyUsersFeatureEnabled,
    defaultIndex,
    factoryQueryType: RiskQueries.usersRiskScore,
  });
};

export const useRiskScore = <T extends RiskQueries.hostsRiskScore | RiskQueries.usersRiskScore>({
  timerange,
  filterQuery,
  sort,
  skip = false,
  pagination,
  featureEnabled,
  defaultIndex,
  factoryQueryType,
}: UseRiskScore<T>) => {
  const { querySize, cursorStart } = pagination || {};

  const { addError } = useAppToasts();

  const {
    loading,
    result: response,
    search,
    refetch,
    inspect,
    error,
  } = useSearchStrategy<RiskQueries.hostsRiskScore | RiskQueries.usersRiskScore>({
    factoryQueryType,
    initialResult: {
      totalCount: 0,
      data: undefined,
    },
    abort: skip,
    showErrorToast: false,
  });

  const riskScoreResponse = useMemo(
    () => ({
      data: response.data,
      inspect,
      refetch,
      totalCount: response.totalCount,
      isModuleEnabled: response.data != null,
      isInspected: false,
    }),
    [inspect, refetch, response]
  );

  const riskScoreRequest = useMemo(
    () =>
      defaultIndex && timerange?.to && timerange?.from
        ? {
            defaultIndex: [defaultIndex],
            factoryQueryType,
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
          }
        : null,
    [cursorStart, defaultIndex, factoryQueryType, filterQuery, querySize, sort, timerange]
  );

  useEffect(() => {
    if (error) {
      if (!isIndexNotFoundError(error)) {
        addError(error, { title: i18n.FAIL_RISK_SCORE });
      }
    }
  }, [addError, error]);

  useEffect(() => {
    if (!skip && riskScoreRequest != null && featureEnabled) {
      search(riskScoreRequest);
    }
  }, [featureEnabled, riskScoreRequest, search, skip]);

  return [loading, riskScoreResponse];
};
