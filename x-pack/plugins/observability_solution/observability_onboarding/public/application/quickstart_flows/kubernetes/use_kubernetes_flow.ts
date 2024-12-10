/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useEffect } from 'react';
import { OBSERVABILITY_ONBOARDING_FLOW_PROGRESS_TELEMETRY_EVENT } from '../../../../common/telemetry_events';
import { ObservabilityOnboardingAppServices } from '../../..';
import { useFetcher } from '../../../hooks/use_fetcher';

export function useKubernetesFlow(
  onboardingFlowType: 'kubernetes_otel' | 'kubernetes' = 'kubernetes'
) {
  const {
    services: {
      analytics,
      context: { cloudServiceProvider },
    },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const { data, status, error, refetch } = useFetcher(
    (callApi) => {
      return callApi('POST /internal/observability_onboarding/kubernetes/flow', {
        params: {
          body: {
            pkgName: onboardingFlowType,
          },
        },
      });
    },
    [onboardingFlowType],
    { showToastOnError: false }
  );

  useEffect(() => {
    if (data?.onboardingId !== undefined) {
      analytics?.reportEvent(OBSERVABILITY_ONBOARDING_FLOW_PROGRESS_TELEMETRY_EVENT.eventType, {
        onboardingFlowType,
        onboardingId: data?.onboardingId,
        step: 'in_progress',
      });
    }
  }, [onboardingFlowType, analytics, cloudServiceProvider, data?.onboardingId]);

  return { data, status, error, refetch } as const;
}
