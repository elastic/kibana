/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { useEffect, useMemo } from 'react';
import { useObservable, withOptionalSignal } from '@kbn/securitysolution-hook-utils';
import { isCompleteResponse, isErrorResponse } from '@kbn/data-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { createFilter } from '../../../common/containers/helpers';

import {
  getHostRiskIndex,
  getUserRiskIndex,
  KpiRiskScoreRequestOptions,
  KpiRiskScoreStrategyResponse,
  RiskQueries,
  RiskScoreAggByFields,
  RiskSeverity,
} from '../../../../common/search_strategy';

import { useKibana } from '../../../common/lib/kibana';
import { isIndexNotFoundError } from '../../../common/utils/exceptions';
import { ESTermQuery } from '../../../../common/typed_json';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { SeverityCount } from '../../../common/components/severity/types';
import { useSpaceId } from '../common';

type GetHostsRiskScoreProps = KpiRiskScoreRequestOptions & {
  data: DataPublicPluginStart;
  signal: AbortSignal;
};

const getRiskyHosts = ({
  data,
  defaultIndex,
  signal,
  filterQuery,
  aggBy,
}: GetHostsRiskScoreProps): Observable<KpiRiskScoreStrategyResponse> =>
  data.search.search<KpiRiskScoreRequestOptions, KpiRiskScoreStrategyResponse>(
    {
      defaultIndex,
      factoryQueryType: RiskQueries.kpiRiskScore,
      filterQuery: createFilter(filterQuery),
      aggBy,
    },
    {
      strategy: 'securitySolutionSearchStrategy',
      abortSignal: signal,
    }
  );

const getRiskyHostsComplete = (
  props: GetHostsRiskScoreProps
): Observable<KpiRiskScoreStrategyResponse> => {
  return getRiskyHosts(props).pipe(
    filter((response) => {
      return isErrorResponse(response) || isCompleteResponse(response);
    })
  );
};

const getRiskyHostsWithOptionalSignal = withOptionalSignal(getRiskyHostsComplete);

const useRiskyHostsComplete = () => useObservable(getRiskyHostsWithOptionalSignal);

interface RiskScoreKpi {
  error: unknown;
  isModuleDisabled: boolean;
  severityCount: SeverityCount;
  loading: boolean;
}

type UseHostRiskScoreKpiProps = Omit<
  UseRiskScoreKpiProps,
  'defaultIndex' | 'aggBy' | 'featureEnabled'
>;
type UseUserRiskScoreKpiProps = Omit<
  UseRiskScoreKpiProps,
  'defaultIndex' | 'aggBy' | 'featureEnabled'
>;

export const useUserRiskScoreKpi = ({
  filterQuery,
  skip,
}: UseUserRiskScoreKpiProps): RiskScoreKpi => {
  const spaceId = useSpaceId();
  const defaultIndex = spaceId ? getUserRiskIndex(spaceId) : undefined;
  const usersFeatureEnabled = useIsExperimentalFeatureEnabled('usersEnabled');

  return useRiskScoreKpi({
    filterQuery,
    skip,
    defaultIndex,
    aggBy: 'user.name',
    featureEnabled: usersFeatureEnabled,
  });
};

export const useHostRiskScoreKpi = ({
  filterQuery,
  skip,
}: UseHostRiskScoreKpiProps): RiskScoreKpi => {
  const spaceId = useSpaceId();
  const defaultIndex = spaceId ? getHostRiskIndex(spaceId) : undefined;
  const riskyHostsFeatureEnabled = useIsExperimentalFeatureEnabled('riskyHostsEnabled');

  return useRiskScoreKpi({
    filterQuery,
    skip,
    defaultIndex,
    aggBy: 'host.name',
    featureEnabled: riskyHostsFeatureEnabled,
  });
};

interface UseRiskScoreKpiProps {
  filterQuery?: string | ESTermQuery;
  skip?: boolean;
  defaultIndex: string | undefined;
  aggBy: RiskScoreAggByFields;
  featureEnabled: boolean;
}

const useRiskScoreKpi = ({
  filterQuery,
  skip,
  defaultIndex,
  aggBy,
  featureEnabled,
}: UseRiskScoreKpiProps): RiskScoreKpi => {
  const { error, result, start, loading } = useRiskyHostsComplete();
  const { data } = useKibana().services;
  const isModuleDisabled = !!error && isIndexNotFoundError(error);

  useEffect(() => {
    if (!skip && defaultIndex && featureEnabled) {
      start({
        data,
        filterQuery,
        defaultIndex: [defaultIndex],
        aggBy,
      });
    }
  }, [data, defaultIndex, start, filterQuery, skip, aggBy, featureEnabled]);

  const severityCount = useMemo(
    () => ({
      [RiskSeverity.unknown]: 0,
      [RiskSeverity.low]: 0,
      [RiskSeverity.moderate]: 0,
      [RiskSeverity.high]: 0,
      [RiskSeverity.critical]: 0,
      ...(result?.kpiRiskScore ?? {}),
    }),
    [result]
  );
  return { error, severityCount, loading, isModuleDisabled };
};
