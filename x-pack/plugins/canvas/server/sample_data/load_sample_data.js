/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ecommerceSavedObjects, flightsSavedObjects, webLogsSavedObjects } from './index';

export function loadSampleData(server) {
  const now = new Date();
  const nowTimestamp = now.toISOString();
  function updateCanvasWorkpadTimestamps(savedObjects) {
    return savedObjects.map(savedObject => {
      if (savedObject.type === 'canvas-workpad') {
        savedObject.attributes['@timestamp'] = nowTimestamp;
        savedObject.attributes['@created'] = nowTimestamp;
      }

      return savedObject;
    });
  }

  server.addSavedObjectsToSampleDataset(
    'ecommerce',
    updateCanvasWorkpadTimestamps(ecommerceSavedObjects)
  );
  server.addSavedObjectsToSampleDataset(
    'flights',
    updateCanvasWorkpadTimestamps(flightsSavedObjects)
  );
  server.addSavedObjectsToSampleDataset('logs', updateCanvasWorkpadTimestamps(webLogsSavedObjects));
}
