/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract, SavedObject } from '@kbn/core/server';
import {
  OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
  ObservabilityOnboardingState,
  SavedObservabilityOnboardingState,
} from '../../saved_objects/observability_onboarding_status';

interface Options {
  savedObjectsClient: SavedObjectsClientContract;
  observabilityOnboardingState: ObservabilityOnboardingState;
  savedObjectId?: string;
}
export async function saveObservabilityOnboardingState({
  savedObjectsClient,
  observabilityOnboardingState,
  savedObjectId,
}: Options): Promise<SavedObservabilityOnboardingState> {
  let savedObject: Omit<
    SavedObject<ObservabilityOnboardingState>,
    'attributes' | 'references'
  >;
  if (savedObjectId) {
    savedObject = await savedObjectsClient.update<ObservabilityOnboardingState>(
      OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
      savedObjectId,
      {
        state: observabilityOnboardingState.state,
        progress: { ...observabilityOnboardingState.progress },
      }
    );
  } else {
    savedObject = await savedObjectsClient.create<ObservabilityOnboardingState>(
      OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
      observabilityOnboardingState
    );
  }
  const { id, updated_at: updatedAt } = savedObject;
  return {
    id,
    ...observabilityOnboardingState,
    updatedAt: updatedAt ? Date.parse(updatedAt) : 0,
  };
}
