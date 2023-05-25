/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import {
  OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
  ObservabilityOnboardingState,
  SavedObservabilityOnboardingState,
} from '../../saved_objects/observability_onboarding_status';

interface Options {
  savedObjectsClient: SavedObjectsClientContract;
  observabilityOnboardingState: ObservabilityOnboardingState;
  apiKeyId: string;
}
export async function saveObservabilityOnboardingState({
  savedObjectsClient,
  observabilityOnboardingState,
  apiKeyId,
}: Options): Promise<SavedObservabilityOnboardingState> {
  const {
    id,
    attributes,
    updated_at: updatedAt,
  } = await savedObjectsClient.update<ObservabilityOnboardingState>(
    OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
    apiKeyId,
    observabilityOnboardingState,
    { upsert: observabilityOnboardingState }
  );
  return {
    id,
    ...(attributes as ObservabilityOnboardingState),
    updatedAt: updatedAt ? Date.parse(updatedAt) : 0,
  };
}
