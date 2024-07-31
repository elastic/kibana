/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObservabilityOnboardingFlow } from '../../../../server/saved_objects/observability_onboarding_status';

export type ObservabilityOnboardingFlowStatus =
  | 'notStarted'
  | 'inProgress'
  | 'awaitingData'
  | 'dataReceived';

/**
 * Returns the current status of the onboarding flow:
 *
 * - `notStarted`: No progress has been made.
 * - `inProgress`: The user is running the installation command on the host.
 * - `awaitingData`: The installation has completed and we are waiting for data to be ingested.
 * - `dataReceived`: Data has been ingested - The Agent is up and running.
 */
export function getOnboardingStatus(
  data: Pick<ObservabilityOnboardingFlow, 'progress'> | undefined
): ObservabilityOnboardingFlowStatus {
  if (!data) {
    return 'notStarted';
  }
  return data.progress['logs-ingest']?.status === 'complete'
    ? 'dataReceived'
    : data.progress['logs-ingest']?.status === 'loading'
    ? 'awaitingData'
    : Object.values(data.progress).some((step) => step.status !== 'incomplete')
    ? 'inProgress'
    : 'notStarted';
}
