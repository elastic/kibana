/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import {
  getHostRiskIndex,
  getUserRiskIndex,
  RiskQueries,
  RiskSeverity,
  RiskScoreEntity,
  EMPTY_SEVERITY_COUNT,
} from '../../../../common/search_strategy';
import { isIndexNotFoundError } from '../../../common/utils/exceptions';
import type { ESQuery } from '../../../../common/typed_json';
import type { SeverityCount } from '../../components/severity/types';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { useSearchStrategy } from '../../../common/containers/use_search_strategy';
import type { InspectResponse } from '../../../types';
import type { inputsModel } from '../../../common/store';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useIsNewRiskScoreModuleInstalled } from './use_risk_engine_status';
import { useRiskScoreFeatureStatus } from './use_risk_score_feature_status';

interface RiskScoreKpi {
  error: unknown;
  isModuleDisabled: boolean;
  severityCount?: SeverityCount;
  loading: boolean;
  refetch: inputsModel.Refetch;
  inspect: InspectResponse;
  timerange?: { to: string; from: string };
}

interface UseRiskScoreKpiProps {
  filterQuery?: string | ESQuery;
  skip?: boolean;
  riskEntity: RiskScoreEntity;
  timerange?: { to: string; from: string };
}

export const useRiskScoreKpi = ({
  filterQuery,
  skip,
  riskEntity,
  timerange,
}: UseRiskScoreKpiProps): RiskScoreKpi => {
  const { addError } = useAppToasts();
  const spaceId = useSpaceId();
  const { installed: isNewRiskScoreModuleInstalled, isLoading: riskScoreStatusLoading } =
    useIsNewRiskScoreModuleInstalled();
  const defaultIndex =
    spaceId && !riskScoreStatusLoading && isNewRiskScoreModuleInstalled !== undefined
      ? riskEntity === RiskScoreEntity.host
        ? getHostRiskIndex(spaceId, true, isNewRiskScoreModuleInstalled)
        : getUserRiskIndex(spaceId, true, isNewRiskScoreModuleInstalled)
      : undefined;

  const {
    isDeprecated,
    isEnabled,
    isAuthorized,
    isLoading: isDeprecatedLoading,
    refetch: refetchFeatureStatus,
  } = useRiskScoreFeatureStatus(riskEntity, defaultIndex);

  const { loading, result, search, refetch, inspect, error } =
    useSearchStrategy<RiskQueries.kpiRiskScore>({
      factoryQueryType: RiskQueries.kpiRiskScore,
      initialResult: {
        kpiRiskScore: EMPTY_SEVERITY_COUNT,
      },
      abort: skip,
      showErrorToast: false,
    });

  const isModuleDisabled = !!error && isIndexNotFoundError(error);

  const requestTimerange = useMemo(
    () => (timerange ? { to: timerange.to, from: timerange.from, interval: '' } : undefined),
    [timerange]
  );

  useEffect(() => {
    if (
      !skip &&
      defaultIndex &&
      !isDeprecatedLoading &&
      isAuthorized &&
      isEnabled &&
      !isDeprecated
    ) {
      search({
        filterQuery,
        defaultIndex: [defaultIndex],
        entity: riskEntity,
        timerange: requestTimerange,
      });
    }
  }, [
    defaultIndex,
    search,
    filterQuery,
    skip,
    riskEntity,
    requestTimerange,
    isEnabled,
    isDeprecated,
    isAuthorized,
    isDeprecatedLoading,
  ]);

  const refetchAll = useCallback(() => {
    if (defaultIndex) {
      refetchFeatureStatus(defaultIndex);
      refetch();
    }
  }, [defaultIndex, refetch, refetchFeatureStatus]);

  useEffect(() => {
    if (error) {
      if (!isIndexNotFoundError(error)) {
        addError(error, {
          title: i18n.translate('xpack.securitySolution.riskScore.kpi.failSearchDescription', {
            defaultMessage: `Failed to run search on risk score`,
          }),
        });
      }
    }
  }, [addError, error]);

  const severityCount = useMemo(() => {
    if (loading || error) {
      return undefined;
    }

    return {
      [RiskSeverity.unknown]: result.kpiRiskScore[RiskSeverity.unknown] ?? 0,
      [RiskSeverity.low]: result.kpiRiskScore[RiskSeverity.low] ?? 0,
      [RiskSeverity.moderate]: result.kpiRiskScore[RiskSeverity.moderate] ?? 0,
      [RiskSeverity.high]: result.kpiRiskScore[RiskSeverity.high] ?? 0,
      [RiskSeverity.critical]: result.kpiRiskScore[RiskSeverity.critical] ?? 0,
    };
  }, [result, loading, error]);

  return { error, severityCount, loading, isModuleDisabled, refetch: refetchAll, inspect };
};
