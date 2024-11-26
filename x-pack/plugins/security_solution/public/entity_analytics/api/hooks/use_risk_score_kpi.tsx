/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import type { RiskScoreEntity } from '../../../../common/search_strategy';
import {
  RiskQueries,
  RiskSeverity,
  EMPTY_SEVERITY_COUNT,
} from '../../../../common/search_strategy';
import { isIndexNotFoundError } from '../../../common/utils/exceptions';
import type { ESQuery } from '../../../../common/typed_json';
import type { SeverityCount } from '../../components/severity/types';
import { useSearchStrategy } from '../../../common/containers/use_search_strategy';
import type { InspectResponse } from '../../../types';
import type { inputsModel } from '../../../common/store';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useGetDefaulRiskIndex } from '../../hooks/use_get_default_risk_index';
import { useRiskEngineStatus } from './use_risk_engine_status';

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
  const defaultIndex = useGetDefaulRiskIndex(riskEntity);
  const {
    data: riskEngineStatus,
    isFetching: isStatusLoading,
    refetch: refetchEngineStatus,
  } = useRiskEngineStatus();
  const riskEngineHasBeenEnabled = riskEngineStatus?.risk_engine_status !== 'NOT_INSTALLED';
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
    if (!skip && defaultIndex && !isStatusLoading && riskEngineHasBeenEnabled) {
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
    isStatusLoading,
    riskEngineHasBeenEnabled,
  ]);

  const refetchAll = useCallback(() => {
    if (defaultIndex) {
      refetchEngineStatus();
      refetch();
    }
  }, [defaultIndex, refetch, refetchEngineStatus]);

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
      [RiskSeverity.Unknown]: result.kpiRiskScore[RiskSeverity.Unknown] ?? 0,
      [RiskSeverity.Low]: result.kpiRiskScore[RiskSeverity.Low] ?? 0,
      [RiskSeverity.Moderate]: result.kpiRiskScore[RiskSeverity.Moderate] ?? 0,
      [RiskSeverity.High]: result.kpiRiskScore[RiskSeverity.High] ?? 0,
      [RiskSeverity.Critical]: result.kpiRiskScore[RiskSeverity.Critical] ?? 0,
    };
  }, [result, loading, error]);

  return { error, severityCount, loading, isModuleDisabled, refetch: refetchAll, inspect };
};
