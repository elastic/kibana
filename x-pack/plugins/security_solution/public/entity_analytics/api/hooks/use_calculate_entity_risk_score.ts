/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

import { i18n } from '@kbn/i18n';
import { useMutation } from '@tanstack/react-query';
import { RiskEngineStatusEnum } from '../../../../common/api/entity_analytics/risk_engine/engine_status_route.gen';
import { useEntityAnalyticsRoutes } from '../api';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useRiskEngineStatus } from './use_risk_engine_status';
import { RiskScoreEntity } from '../../../../common/entity_analytics/risk_engine';

export const useCalculateEntityRiskScore = (
  identifierType: RiskScoreEntity,
  identifier: string,
  { onSuccess }: { onSuccess: () => void }
) => {
  const { addError } = useAppToasts();
  const { data: riskEngineStatus } = useRiskEngineStatus();
  const { calculateEntityRiskScore } = useEntityAnalyticsRoutes();

  const onError = useCallback(
    (error: unknown) => {
      addError(error, {
        title: i18n.translate('xpack.securitySolution.entityDetails.userPanel.error', {
          defaultMessage: 'There was a problem calculating the {entity} risk score',
          values: { entity: identifierType === RiskScoreEntity.host ? "host's" : "user's" },
        }),
      });
    },
    [addError, identifierType]
  );

  const { mutate, isLoading, data } = useMutation(calculateEntityRiskScore, {
    onSuccess,
    onError,
  });

  const calculateEntityRiskScoreCb = useCallback(async () => {
    if (riskEngineStatus?.risk_engine_status === RiskEngineStatusEnum.ENABLED) {
      mutate({
        identifier_type: identifierType,
        identifier,
        refresh: 'wait_for',
      });
    }
  }, [riskEngineStatus?.risk_engine_status, mutate, identifierType, identifier]);

  return {
    isLoading,
    calculateEntityRiskScore: calculateEntityRiskScoreCb,
    data,
  };
};
