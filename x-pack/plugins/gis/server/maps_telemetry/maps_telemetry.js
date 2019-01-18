/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const MAPS_TELEMETRY_DOC_ID = 'maps-telemetry';

export function createMapsTelemetry() {
  return {
    layerDetails: {}
  };
}

export function storeMapsTelemetry(server, mapsTelemetry) {
  const savedObjectsClient = getSavedObjectsClient(server);
  savedObjectsClient.create('maps-telemetry', mapsTelemetry, {
    id: MAPS_TELEMETRY_DOC_ID,
    overwrite: true
  });
}

export function getSavedObjectsClient(server) {
  const { SavedObjectsClient, getSavedObjectsRepository } = server.savedObjects;
  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster(
    'admin'
  );
  const internalRepository = getSavedObjectsRepository(callWithInternalUser);
  return new SavedObjectsClient(internalRepository);
}
