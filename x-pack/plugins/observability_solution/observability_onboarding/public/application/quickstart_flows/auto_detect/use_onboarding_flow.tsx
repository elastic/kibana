/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useInterval from 'react-use/lib/useInterval';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { getOnboardingStatus } from './get_onboarding_status';
import { getInstalledIntegrations } from './get_installed_integrations';

export function useOnboardingFlow() {
  const { data, error, refetch } = useFetcher(
    (callApi) =>
      callApi('POST /internal/observability_onboarding/flow', {
        params: {
          body: {
            name: 'auto-detect',
          },
        },
      }),
    [],
    { showToastOnError: false }
  );

  const onboardingId = data?.onboardingFlow.id;

  const {
    data: progressData,
    status: progressStatus,
    refetch: refetchProgress,
  } = useFetcher(
    (callApi) => {
      if (onboardingId) {
        return callApi('GET /internal/observability_onboarding/flow/{onboardingId}/progress', {
          params: { path: { onboardingId } },
        });
      }
    },
    [onboardingId]
  );

  const status = getOnboardingStatus(progressData);
  const installedIntegrations = getInstalledIntegrations(progressData);

  useInterval(
    refetchProgress,
    progressStatus === FETCH_STATUS.SUCCESS && status !== 'dataReceived' ? 3000 : null
  );

  return {
    data,
    error,
    refetch,
    status,
    installedIntegrations,
  };
}
