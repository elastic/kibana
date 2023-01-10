/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';

import {
  getHostRiskIndex,
  getUserRiskIndex,
  RiskQueries,
  RiskSeverity,
  RiskScoreEntity,
  EMPTY_SEVERITY_COUNT,
} from '../../../../../common/search_strategy';
import * as i18n from './translations';
import { isIndexNotFoundError } from '../../../../common/utils/exceptions';
import type { ESTermQuery } from '../../../../../common/typed_json';
import type { SeverityCount } from '../../../components/risk_score/severity/types';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useMlCapabilities } from '../../../../common/components/ml/hooks/use_ml_capabilities';
import { useSearchStrategy } from '../../../../common/containers/use_search_strategy';
import type { InspectResponse } from '../../../../types';
import type { inputsModel } from '../../../../common/store';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

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
  filterQuery?: string | ESTermQuery;
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
  const featureEnabled = useMlCapabilities().isPlatinumOrTrialLicense;
  const defaultIndex = spaceId
    ? riskEntity === RiskScoreEntity.host
      ? getHostRiskIndex(spaceId)
      : getUserRiskIndex(spaceId)
    : undefined;

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

  useEffect(() => {
    if (!skip && defaultIndex && featureEnabled) {
      search({
        filterQuery,
        defaultIndex: [defaultIndex],
        entity: riskEntity,
      });
    }
  }, [defaultIndex, search, filterQuery, skip, riskEntity, featureEnabled]);

  // since query does not take timerange arg, we need to manually refetch when time range updates
  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerange?.to, timerange?.from]);

  useEffect(() => {
    if (error) {
      if (!isIndexNotFoundError(error)) {
        addError(error, { title: i18n.FAIL_RISK_SCORE });
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

  return { error, severityCount, loading, isModuleDisabled, refetch, inspect };
};
