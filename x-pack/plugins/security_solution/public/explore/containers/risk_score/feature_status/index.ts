/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useMlCapabilities } from '../../../../common/components/ml/hooks/use_ml_capabilities';
import { REQUEST_NAMES, useFetch } from '../../../../common/hooks/use_fetch';
import type { RiskScoreEntity } from '../../../../../common/search_strategy';
import { getRiskScoreIndexStatus } from './api';

interface RiskScoresFeatureStatus {
  error: unknown;
  // Is transform index an old version?
  isDeprecated: boolean;
  // does the transform index exist?
  isEnabled: boolean;
  // is the user's license platinum?
  isLicenseValid: boolean;
  isLoading: boolean;
  refetch: (indexName: string) => void;
}

export const useRiskScoreFeatureStatus = (
  riskEntity: RiskScoreEntity.host | RiskScoreEntity.user,
  defaultIndex?: string
): RiskScoresFeatureStatus => {
  const { isPlatinumOrTrialLicense, capabilitiesFetched } = useMlCapabilities();

  const { fetch, data, isLoading, error } = useFetch(
    REQUEST_NAMES.GET_RISK_SCORE_DEPRECATED,
    getRiskScoreIndexStatus
  );

  const response = useMemo(
    // if license is enabled, let isDeprecated = true so the actual
    // risk score fetch is not called until this check is complete
    () =>
      data ? data : { isDeprecated: isPlatinumOrTrialLicense, isEnabled: isPlatinumOrTrialLicense },
    // isPlatinumOrTrialLicense is initial state, not update requirement
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data]
  );

  const searchIndexStatus = useCallback(
    (indexName: string) => {
      fetch({
        query: { indexName, entity: riskEntity },
      });
    },
    [riskEntity, fetch]
  );

  useEffect(() => {
    if (isPlatinumOrTrialLicense && defaultIndex != null) {
      searchIndexStatus(defaultIndex);
    }
  }, [isPlatinumOrTrialLicense, defaultIndex, searchIndexStatus]);

  return {
    error,
    isLoading: isLoading || !capabilitiesFetched || defaultIndex == null,
    refetch: searchIndexStatus,
    isLicenseValid: isPlatinumOrTrialLicense,
    ...response,
  };
};
