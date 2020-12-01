/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { SavedObject } from 'src/core/server';
import { HomeServerPluginSetup } from '../../../../../src/plugins/home/server';
import { taggableTypes } from '../../common/constants';
import { tagIdToReference } from '../../common/references';
import { ecommerceTag, flightsTag, logsTag, sampleDataTag } from './sample_tags';

export const addTagsToSampleData = (home: HomeServerPluginSetup) => {
  // flights
  home.sampleData.addSavedObjectsToSampleDataset('flights', [flightsTag, sampleDataTag]);
  home.sampleData.updateSavedObjects(
    'flights',
    addTagsIfTaggable([flightsTag.id, sampleDataTag.id])
  );
  // logs
  home.sampleData.addSavedObjectsToSampleDataset('logs', [logsTag, sampleDataTag]);
  home.sampleData.updateSavedObjects('logs', addTagsIfTaggable([logsTag.id, sampleDataTag.id]));
  // ecommerce
  home.sampleData.addSavedObjectsToSampleDataset('ecommerce', [ecommerceTag, sampleDataTag]);
  home.sampleData.updateSavedObjects(
    'ecommerce',
    addTagsIfTaggable([ecommerceTag.id, sampleDataTag.id])
  );
};

const addTagsIfTaggable = (tagIds: string[]) => (object: SavedObject) => {
  if (taggableTypes.includes(object.type)) {
    object.references = [...object.references, ...tagIds.map(tagIdToReference)];
  }
};
