/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObject,
  SavedObjectAttributes,
  SavedObjectMeta,
  SavedObjectReferences,
} from '../../types';

export function createJobSearch(
  savedObject: SavedObject,
  kibanaSavedObjectMeta: SavedObjectMeta,
  attributes: SavedObjectAttributes
) {
  const { searchSourceJSON } = kibanaSavedObjectMeta;
  const references: SavedObjectReferences[] = savedObject.references!;
  if (!searchSourceJSON || !references) {
    throw new Error('The saved search object is missing configuration fields!');
  }
  const searchSource = JSON.parse(searchSourceJSON);

  const sPanel = {
    attributes: {
      ...savedObject.attributes,
      kibanaSavedObjectMeta: { searchSource },
    },
    references,
  };
  return { panel: sPanel, title: attributes.title, visType: 'search' };
}
