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
    if (data?.onboardingId !== undefined) {
      analytics?.reportEvent(OBSERVABILITY_ONBOARDING_FLOW_PROGRESS_TELEMETRY_EVENT.eventType, {
        onboardingFlowType: 'firehose',
        onboardingId: data?.onboardingId,
        step: 'in_progress',
        context: {
          firehose: {
            cloudServiceProvider,
          },
        },
      });
    }
  }, [analytics, cloudServiceProvider, data?.onboardingId]);

  return { data, status, error, refetch } as const;
}
