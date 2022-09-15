/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';

import { createFilter } from '../../../common/containers/helpers';
import type { RiskScoreSortField, StrategyResponseType } from '../../../../common/search_strategy';
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
import type { inputsModel } from '../../../common/store';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { useSearchStrategy } from '../../../common/containers/use_search_strategy';
import { useMlCapabilities } from '../../../common/components/ml/hooks/use_ml_capabilities';

export interface RiskScoreState<T extends RiskQueries.hostsRiskScore | RiskQueries.usersRiskScore> {
  data: undefined | StrategyResponseType<T>['data'];
  inspect: InspectResponse;
  isInspected: boolean;
  refetch: inputsModel.Refetch;
  totalCount: number;
  isModuleEnabled: boolean;
  isLicenseValid: boolean;
}

export interface UseRiskScoreParams {
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

interface UseRiskScore<T> extends UseRiskScoreParams {
  defaultIndex: string | undefined;
  factoryQueryType: T;
}

export const initialResult: Omit<
  StrategyResponseType<RiskQueries.hostsRiskScore | RiskQueries.usersRiskScore>,
  'rawResponse'
> = {
  totalCount: 0,
  data: undefined,
};

export const useHostRiskScore = (params?: UseRiskScoreParams) => {
  const { timerange, onlyLatest, filterQuery, sort, skip = false, pagination } = params ?? {};
  const spaceId = useSpaceId();
  const defaultIndex = spaceId ? getHostRiskIndex(spaceId, onlyLatest) : undefined;

  return useRiskScore({
    timerange,
    onlyLatest,
    filterQuery,
    sort,
    skip,
    pagination,
    defaultIndex,
    factoryQueryType: RiskQueries.hostsRiskScore,
  });
};

export const useUserRiskScore = (params?: UseRiskScoreParams) => {
  const { timerange, onlyLatest, filterQuery, sort, skip = false, pagination } = params ?? {};
  const spaceId = useSpaceId();
  const defaultIndex = spaceId ? getUserRiskIndex(spaceId, onlyLatest) : undefined;

  return useRiskScore({
    timerange,
    onlyLatest,
    filterQuery,
    sort,
    skip,
    pagination,
    defaultIndex,
    factoryQueryType: RiskQueries.usersRiskScore,
  });
};

const useRiskScore = <T extends RiskQueries.hostsRiskScore | RiskQueries.usersRiskScore>({
  timerange,
  filterQuery,
  sort,
  skip = false,
  pagination,
  defaultIndex,
  factoryQueryType,
}: UseRiskScore<T>): [boolean, RiskScoreState<T>] => {
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
    initialResult,
    abort: skip,
    showErrorToast: false,
  });
  const isPlatinumOrTrialLicense = useMlCapabilities().isPlatinumOrTrialLicense;

  const riskScoreResponse = useMemo(
    () => ({
      data: response.data,
      inspect,
      refetch,
      totalCount: response.totalCount,
      isLicenseValid: isPlatinumOrTrialLicense,
      isModuleEnabled: skip
        ? isPlatinumOrTrialLicense
        : isPlatinumOrTrialLicense && response.data != null,
      isInspected: false,
    }),
    [isPlatinumOrTrialLicense, inspect, refetch, response.data, response.totalCount, skip]
  );

  const riskScoreRequest = useMemo(
    () =>
      defaultIndex
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
    if (!skip && riskScoreRequest != null && isPlatinumOrTrialLicense) {
      search(riskScoreRequest);
    }
  }, [isPlatinumOrTrialLicense, riskScoreRequest, search, skip]);

  return [loading, riskScoreResponse];
};
