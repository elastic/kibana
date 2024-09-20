/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import useEvent from 'react-use/lib/useEvent';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { OBSERVABILITY_ONBOARDING_FIREHOSE_STARTED_MONITOR_DATA_TELEMETRY_EVENT } from '../../../../common/telemetry_events';
import { ObservabilityOnboardingAppServices } from '../../..';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { CreateStackOption } from './types';

export function useMonitoringDataFlag({
  selectedCreateStackOption,
  flowRequestStatus,
  onboardingId,
}: {
  selectedCreateStackOption: CreateStackOption;
  flowRequestStatus: FETCH_STATUS;
  onboardingId?: string;
}) {
  const [windowLostFocus, setWindowLostFocus] = useState(false);
  const {
    services: {
      analytics,
      context: { cloudServiceProvider },
    },
  } = useKibana<ObservabilityOnboardingAppServices>();

  useEvent('blur', () => setWindowLostFocus(true), window);

  const isMonitoringData = flowRequestStatus === FETCH_STATUS.SUCCESS && windowLostFocus;

  useEffect(() => {
    if (isMonitoringData && onboardingId !== undefined) {
      analytics?.reportEvent(
        OBSERVABILITY_ONBOARDING_FIREHOSE_STARTED_MONITOR_DATA_TELEMETRY_EVENT.eventType,
        {
          selectedCreateStackOption,
          cloudServiceProvider,
          onboardingId,
        }
      );
    }
  }, [analytics, cloudServiceProvider, isMonitoringData, onboardingId, selectedCreateStackOption]);

  return isMonitoringData;
}
