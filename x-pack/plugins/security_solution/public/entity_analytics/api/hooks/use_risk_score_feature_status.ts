/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useMlCapabilities } from '../../../common/components/ml/hooks/use_ml_capabilities';
import { REQUEST_NAMES, useFetch } from '../../../common/hooks/use_fetch';
import type { RiskScoreEntity } from '../../../../common/search_strategy';
import { useHasSecurityCapability } from '../../../helper_hooks';
import { useEntityAnalyticsRoutes } from '../api';

interface RiskScoresFeatureStatus {
  error: unknown;
  // Is transform index an old version?
  isDeprecated: boolean;
  // Does the transform index exist?
  isEnabled: boolean;
  // Does the user has the authorization for the risk score feature?
  isAuthorized: boolean;
  isLoading: boolean;
  refetch: (indexName: string) => void;
}

export const useRiskScoreFeatureStatus = (
  riskEntity: RiskScoreEntity.host | RiskScoreEntity.user,
  defaultIndex?: string
): RiskScoresFeatureStatus => {
  const { isPlatinumOrTrialLicense, capabilitiesFetched } = useMlCapabilities();
  const hasEntityAnalyticsCapability = useHasSecurityCapability('entity-analytics');
  const isAuthorized = isPlatinumOrTrialLicense && hasEntityAnalyticsCapability;
  const { getRiskScoreIndexStatus } = useEntityAnalyticsRoutes();

  const { fetch, data, isLoading, error } = useFetch(
    REQUEST_NAMES.GET_RISK_SCORE_DEPRECATED,
    getRiskScoreIndexStatus
  );

  const response = useMemo(
    // if authorized is true, let isDeprecated = true so the actual
    // risk score fetch is not called until this check is complete
    () => (data ? data : { isDeprecated: isAuthorized, isEnabled: isAuthorized }),
    // isAuthorized is initial state, not update requirement
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data]
  );

  const searchIndexStatus = useCallback(
    (indexName: string) => {
      if (isAuthorized) {
        fetch({
          query: { indexName, entity: riskEntity },
        });
      }
    },
    [isAuthorized, fetch, riskEntity]
  );

  useEffect(() => {
    if (defaultIndex != null) {
      searchIndexStatus(defaultIndex);
    }
  }, [defaultIndex, searchIndexStatus]);

  return {
    error,
    isLoading: isLoading || !capabilitiesFetched || defaultIndex == null,
    refetch: searchIndexStatus,
    isAuthorized,
    ...response,
  };
};
