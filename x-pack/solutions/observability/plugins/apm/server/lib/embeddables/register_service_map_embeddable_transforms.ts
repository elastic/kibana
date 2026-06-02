/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { APM_SERVICE_MAP_EMBEDDABLE } from '@kbn/apm-embeddable-common';
import {
  getServiceMapEmbeddableSchema,
  type ServiceMapEmbeddableState,
} from './service_map_embeddable_schema';

/**
 * Legacy shape: early service map panels (pre-`apply_custom_filters`) stored a
 * `sync_with_dashboard_filters` boolean. The current schema rejects it as an unknown
 * property, which breaks saving any dashboard that still holds such a panel.
 */
type LegacyServiceMapEmbeddableState = ServiceMapEmbeddableState & {
  sync_with_dashboard_filters?: boolean;
};

/**
 * Migrate legacy `sync_with_dashboard_filters` → `apply_custom_filters` (inverted) and drop
 * the legacy key so the state validates against the current schema.
 *
 * Semantics: old `sync_with_dashboard_filters: true` meant "panel follows the dashboard's
 * filters", which is the new `apply_custom_filters: false`. An explicit new-field value (if
 * somehow already present) wins.
 */
function migrateServiceMapEmbeddableState(
  storedState: LegacyServiceMapEmbeddableState
): ServiceMapEmbeddableState {
  const { sync_with_dashboard_filters: legacySync, ...rest } = storedState;
  if (legacySync === undefined) {
    return rest;
  }
  return {
    ...rest,
    apply_custom_filters: rest.apply_custom_filters ?? !legacySync,
  };
}

export const registerServiceMapEmbeddableTransforms = (embeddable: EmbeddableSetup): void => {
  embeddable.registerEmbeddableServerDefinition(APM_SERVICE_MAP_EMBEDDABLE, {
    title: 'APM Service map',
    getSchema: getServiceMapEmbeddableSchema,
    getTransforms: () => ({
      // Runs on read; the migrated (legacy-key-free) state is what the dashboard then holds
      // and re-validates on save, so PoC-era panels stop failing dashboard saves.
      transformOut: (storedState) =>
        migrateServiceMapEmbeddableState(storedState as LegacyServiceMapEmbeddableState),
    }),
  });
};
