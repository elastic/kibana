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

export async function findObservabilityOnboardingState({
  savedObjectsClient,
  apiKeyId,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  apiKeyId: string;
}): Promise<SavedObservabilityOnboardingState> {
  const result = await savedObjectsClient.find<ObservabilityOnboardingState>({
    type: OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
    page: 1,
    perPage: 1,
    filter: `${OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE}.attributes.apiKeyId: "${apiKeyId}"`,
  });
  return (
    result.saved_objects.map(({ id, attributes, updated_at: upatedAt }) => ({
      id,
      updatedAt: upatedAt ? Date.parse(upatedAt) : 0,
      ...attributes,
    }))?.[0] ?? {}
  );
}
