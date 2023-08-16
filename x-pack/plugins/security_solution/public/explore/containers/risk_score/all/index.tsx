/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';

import { useRiskScoreFeatureStatus } from '../feature_status';
import { createFilter } from '../../../../common/containers/helpers';
import type {
  RiskScoreSortField,
  StrategyResponseType,
} from '../../../../../common/search_strategy';
import {
  RiskQueries,
  getUserRiskIndex,
  RiskScoreEntity,
  getHostRiskIndex,
} from '../../../../../common/search_strategy';
import type { ESQuery } from '../../../../../common/typed_json';

import * as i18n from './translations';
import type { InspectResponse } from '../../../../types';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { isIndexNotFoundError } from '../../../../common/utils/exceptions';
import type { inputsModel } from '../../../../common/store';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useSearchStrategy } from '../../../../common/containers/use_search_strategy';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';

export interface RiskScoreState<T extends RiskScoreEntity.host | RiskScoreEntity.user> {
  data:
    | undefined
    | StrategyResponseType<
        T extends RiskScoreEntity.host ? RiskQueries.hostsRiskScore : RiskQueries.usersRiskScore
      >['data'];
  inspect: InspectResponse;
  isInspected: boolean;
  refetch: inputsModel.Refetch;
  totalCount: number;
  isModuleEnabled: boolean;
  isAuthorized: boolean;
  isDeprecated: boolean;
  loading: boolean;
}

export interface UseRiskScoreParams {
  filterQuery?: ESQuery | string;
  onlyLatest?: boolean;
  includeAlertsCount?: boolean;
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

interface UseRiskScore<T> extends UseRiskScoreParams {
  riskEntity: T;
}

export const initialResult: Omit<
  StrategyResponseType<RiskQueries.hostsRiskScore | RiskQueries.usersRiskScore>,
  'rawResponse'
> = {
  totalCount: 0,
  data: undefined,
};

export const useRiskScore = <T extends RiskScoreEntity.host | RiskScoreEntity.user>({
  timerange,
  onlyLatest = true,
  filterQuery,
  sort,
  skip = false,
  pagination,
  riskEntity,
  includeAlertsCount = false,
}: UseRiskScore<T>): RiskScoreState<T> => {
  const spaceId = useSpaceId();
  const isNewRiskScoreModuleAvailable = useIsExperimentalFeatureEnabled('riskScoringRoutesEnabled');
  const defaultIndex = spaceId
    ? riskEntity === RiskScoreEntity.host
      ? getHostRiskIndex(spaceId, onlyLatest, isNewRiskScoreModuleAvailable)
      : getUserRiskIndex(spaceId, onlyLatest, isNewRiskScoreModuleAvailable)
    : undefined;
  const factoryQueryType =
    riskEntity === RiskScoreEntity.host ? RiskQueries.hostsRiskScore : RiskQueries.usersRiskScore;

  const { querySize, cursorStart } = pagination || {};

  const { addError } = useAppToasts();

  const {
    isDeprecated,
    isEnabled,
    isAuthorized,
    isLoading: isDeprecatedLoading,
    refetch: refetchDeprecated,
  } = useRiskScoreFeatureStatus(riskEntity, defaultIndex);

  const {
    loading,
    result: response,
    search,
    refetch,
    inspect,
    error,
  } = useSearchStrategy<RiskQueries.hostsRiskScore | RiskQueries.usersRiskScore>({
    factoryQueryType,
    initialResult,
    abort: skip,
    showErrorToast: false,
  });
  const refetchAll = useCallback(() => {
    if (defaultIndex) {
      refetchDeprecated(defaultIndex);
      refetch();
    }
  }, [defaultIndex, refetch, refetchDeprecated]);

  // since query does not take timerange arg, we need to manually refetch when time range updates
  // the results can be different if the user has run the ML for the first time since pressing refresh
  useEffect(() => {
    refetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerange?.to, timerange?.from]);

  const riskScoreResponse = useMemo(
    () => ({
      data: response.data,
      inspect,
      refetch: refetchAll,
      totalCount: response.totalCount,
      isAuthorized,
      isDeprecated,
      isModuleEnabled: isEnabled,
      isInspected: false,
    }),
    [inspect, isDeprecated, isEnabled, isAuthorized, refetchAll, response.data, response.totalCount]
  );

  const requestTimerange = useMemo(
    () => (timerange ? { to: timerange.to, from: timerange.from, interval: '' } : undefined),
    [timerange]
  );

  const riskScoreRequest = useMemo(
    () =>
      defaultIndex
        ? {
            defaultIndex: [defaultIndex],
            factoryQueryType,
            riskScoreEntity: riskEntity,
            includeAlertsCount,
            filterQuery: createFilter(filterQuery),
            pagination:
              cursorStart !== undefined && querySize !== undefined
                ? {
                    cursorStart,
                    querySize,
                  }
                : undefined,
            sort,
            timerange: onlyLatest ? undefined : requestTimerange,
            alertsTimerange: includeAlertsCount ? requestTimerange : undefined,
          }
        : null,
    [
      cursorStart,
      defaultIndex,
      factoryQueryType,
      filterQuery,
      querySize,
      sort,
      requestTimerange,
      onlyLatest,
      riskEntity,
      includeAlertsCount,
    ]
  );

  useEffect(() => {
    if (error) {
      if (!isIndexNotFoundError(error)) {
        addError(error, { title: i18n.FAIL_RISK_SCORE });
      }
    }
  }, [addError, error]);

  useEffect(() => {
    if (
      !skip &&
      !isDeprecatedLoading &&
      riskScoreRequest != null &&
      isAuthorized &&
      isEnabled &&
      !isDeprecated
    ) {
      search(riskScoreRequest);
    }
  }, [isEnabled, isDeprecated, isAuthorized, isDeprecatedLoading, riskScoreRequest, search, skip]);

  return { ...riskScoreResponse, loading: loading || isDeprecatedLoading };
};
