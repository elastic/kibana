/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObject,
  SavedObjectMeta,
  SavedObjectReference
} from '../../types';

export async function createJobSearch(
  savedObjectsClient: any,
  savedObject: SavedObject,
  kibanaSavedObjectMeta: SavedObjectMeta
) {
  const { attributes, references } = savedObject;

  const { searchSourceJSON } = kibanaSavedObjectMeta;
  if (!searchSourceJSON || !references) {
    throw new Error('The saved search object is missing configuration fields!');
  }
  const searchSource = JSON.parse(searchSourceJSON);

  const indexPatternMeta = references.find((ref: SavedObjectReference) => ref.type === 'index-pattern');
  if (!indexPatternMeta) {
    throw new Error('Could not find index pattern for the saved search!');
  }
  const indexPatternSavedObject = await savedObjectsClient.get('index-pattern', indexPatternMeta.id);

  const sPanel = {
    indexPatternSavedObject,
    attributes: {
      ...attributes,
      kibanaSavedObjectMeta: { searchSource },
    },
    references,
  };
  return { panel: sPanel, title: attributes.title, visType: 'search' };
}
