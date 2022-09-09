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

import type {
  KpiRiskScoreRequestOptions,
  KpiRiskScoreStrategyResponse,
} from '../../../../common/search_strategy';
import {
  getHostRiskIndex,
  getUserRiskIndex,
  RiskQueries,
  RiskSeverity,
  RiskScoreEntity,
} from '../../../../common/search_strategy';

import { useKibana } from '../../../common/lib/kibana';
import { isIndexNotFoundError } from '../../../common/utils/exceptions';
import type { ESTermQuery } from '../../../../common/typed_json';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import type { SeverityCount } from '../../../common/components/severity/types';
import { useSpaceId } from '../../../common/hooks/use_space_id';

type GetHostRiskScoreProps = KpiRiskScoreRequestOptions & {
  data: DataPublicPluginStart;
  signal: AbortSignal;
};

const getRiskScoreKpi = ({
  data,
  defaultIndex,
  signal,
  filterQuery,
  entity,
}: GetHostRiskScoreProps): Observable<KpiRiskScoreStrategyResponse> =>
  data.search.search<KpiRiskScoreRequestOptions, KpiRiskScoreStrategyResponse>(
    {
      defaultIndex,
      factoryQueryType: RiskQueries.kpiRiskScore,
      filterQuery: createFilter(filterQuery),
      entity,
    },
    {
      strategy: 'securitySolutionSearchStrategy',
      abortSignal: signal,
    }
  );

const getRiskScoreKpiComplete = (
  props: GetHostRiskScoreProps
): Observable<KpiRiskScoreStrategyResponse> => {
  return getRiskScoreKpi(props).pipe(
    filter((response) => {
      return isErrorResponse(response) || isCompleteResponse(response);
    })
  );
};

const getRiskScoreKpiWithOptionalSignal = withOptionalSignal(getRiskScoreKpiComplete);

const useRiskScoreKpiComplete = () => useObservable(getRiskScoreKpiWithOptionalSignal);

interface RiskScoreKpi {
  error: unknown;
  isModuleDisabled: boolean;
  severityCount: SeverityCount;
  loading: boolean;
}

type UseHostRiskScoreKpiProps = Omit<
  UseRiskScoreKpiProps,
  'defaultIndex' | 'aggBy' | 'featureEnabled' | 'entity'
>;
type UseUserRiskScoreKpiProps = Omit<
  UseRiskScoreKpiProps,
  'defaultIndex' | 'aggBy' | 'featureEnabled' | 'entity'
>;

export const useUserRiskScoreKpi = ({
  filterQuery,
  skip,
}: UseUserRiskScoreKpiProps): RiskScoreKpi => {
  const spaceId = useSpaceId();
  const defaultIndex = spaceId ? getUserRiskIndex(spaceId) : undefined;
  const riskyUsersFeatureEnabled = useIsExperimentalFeatureEnabled('riskyUsersEnabled');

  return useRiskScoreKpi({
    filterQuery,
    skip,
    defaultIndex,
    entity: RiskScoreEntity.user,
    featureEnabled: riskyUsersFeatureEnabled,
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
    entity: RiskScoreEntity.host,
    featureEnabled: riskyHostsFeatureEnabled,
  });
};

interface UseRiskScoreKpiProps {
  filterQuery?: string | ESTermQuery;
  skip?: boolean;
  defaultIndex: string | undefined;
  entity: RiskScoreEntity;
  featureEnabled: boolean;
}

const useRiskScoreKpi = ({
  filterQuery,
  skip,
  defaultIndex,
  entity,
  featureEnabled,
}: UseRiskScoreKpiProps): RiskScoreKpi => {
  const { error, result, start, loading } = useRiskScoreKpiComplete();
  const { data } = useKibana().services;
  const isModuleDisabled = !!error && isIndexNotFoundError(error);

  useEffect(() => {
    if (!skip && defaultIndex && featureEnabled) {
      start({
        data,
        filterQuery,
        defaultIndex: [defaultIndex],
        entity,
      });
    }
  }, [data, defaultIndex, start, filterQuery, skip, entity, featureEnabled]);

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
