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

export async function findLatestObservabilityOnboardingState({
  savedObjectsClient,
}: {
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<SavedObservabilityOnboardingState | undefined> {
  const result = await savedObjectsClient.find<ObservabilityOnboardingState>({
    type: OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
    page: 1,
    perPage: 1,
    sortField: `updated_at`,
    sortOrder: 'desc',
  });
  if (result.total === 0) {
    return undefined;
  }
  const { id, updated_at: updatedAt, attributes } = result.saved_objects[0];
  return {
    id,
    updatedAt: updatedAt ? Date.parse(updatedAt) : 0,
    ...attributes,
  };
}
