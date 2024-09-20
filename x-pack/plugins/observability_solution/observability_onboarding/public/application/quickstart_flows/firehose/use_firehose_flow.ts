/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { ObservabilityOnboardingAppServices } from '../../..';
import { OBSERVABILITY_ONBOARDING_FIREHOSE_INITIALIZE_TELEMETRY_EVENT } from '../../../../common/telemetry_events';

export function useFirehoseFlow() {
  const {
    services: {
      analytics,
      context: { cloudServiceProvider },
    },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const { data, status, error, refetch } = useFetcher(
    (callApi) => {
      return callApi('POST /internal/observability_onboarding/firehose/flow');
    },
    [],
    { showToastOnError: false }
  );

  useEffect(() => {
    if (status === FETCH_STATUS.FAILURE || status === FETCH_STATUS.SUCCESS) {
      analytics?.reportEvent(
        OBSERVABILITY_ONBOARDING_FIREHOSE_INITIALIZE_TELEMETRY_EVENT.eventType,
        {
          status,
          cloudServiceProvider,
          onboardingId: data?.onboardingId,
          error: error?.message,
        }
      );
    }
  }, [analytics, cloudServiceProvider, data, error, status]);

  return { data, status, error, refetch } as const;
}
