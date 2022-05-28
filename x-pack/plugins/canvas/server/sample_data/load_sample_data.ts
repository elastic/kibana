/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SampleDataRegistrySetup } from '@kbn/home-plugin/server';
import { CANVAS as label } from '../../i18n';
import { ecommerceSavedObjects, flightsSavedObjects, webLogsSavedObjects } from '.';

export function loadSampleData(
  addSavedObjectsToSampleDataset: SampleDataRegistrySetup['addSavedObjectsToSampleDataset'],
  addAppLinksToSampleDataset: SampleDataRegistrySetup['addAppLinksToSampleDataset']
) {
  const now = new Date();
  const nowTimestamp = now.toISOString();

  // @ts-expect-error: untyped local
  function updateCanvasWorkpadTimestamps(savedObjects) {
    // @ts-expect-error: untyped local
    return savedObjects.map((savedObject) => {
      if (savedObject.type === 'canvas-workpad') {
        savedObject.attributes['@timestamp'] = nowTimestamp;
        savedObject.attributes['@created'] = nowTimestamp;
      }

      return savedObject;
    });
  }
  const getPath = (objectId: string) => `/app/canvas#/workpad/${objectId}`;

  addSavedObjectsToSampleDataset('ecommerce', updateCanvasWorkpadTimestamps(ecommerceSavedObjects));
  addAppLinksToSampleDataset('ecommerce', [
    {
      sampleObject: {
        type: 'canvas-workpad',
        id: 'workpad-e08b9bdb-ec14-4339-94c4-063bddfd610e',
      },
      getPath,
      icon: 'canvasApp',
      label,
    },
  ]);

  addSavedObjectsToSampleDataset('flights', updateCanvasWorkpadTimestamps(flightsSavedObjects));
  addAppLinksToSampleDataset('flights', [
    {
      sampleObject: {
        type: 'canvas-workpad',
        id: 'workpad-a474e74b-aedc-47c3-894a-db77e62c41e0',
      },
      getPath,
      icon: 'canvasApp',
      label,
    },
  ]);

  addSavedObjectsToSampleDataset('logs', updateCanvasWorkpadTimestamps(webLogsSavedObjects));
  addAppLinksToSampleDataset('logs', [
    {
      sampleObject: {
        type: 'canvas-workpad',
        id: 'workpad-ad72a4e9-b422-480c-be6d-a64a0b79541d',
      },
      getPath,
      icon: 'canvasApp',
      label,
    },
  ]);
}
