/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObject,
  SavedObjectMeta,
  SavedObjectReference,
  SearchPanel,
  TimeRangeParams,
} from '../../types';

interface SearchPanelData {
  title: string;
  visType: string;
  panel: SearchPanel;
}

export async function createJobSearch(
  savedObjectsClient: any,
  timerange: TimeRangeParams,
  savedObject: SavedObject,
  kibanaSavedObjectMeta: SavedObjectMeta
): Promise<SearchPanelData> {
  const { attributes, references } = savedObject;

  const { searchSourceJSON } = kibanaSavedObjectMeta;
  if (!searchSourceJSON || !references) {
    throw new Error('The saved search object is missing configuration fields!');
  }
  const searchSource = JSON.parse(searchSourceJSON);

  const indexPatternMeta = references.find(
    (ref: SavedObjectReference) => ref.type === 'index-pattern'
  );
  if (!indexPatternMeta) {
    throw new Error('Could not find index pattern for the saved search!');
  }
  const indexPatternSavedObject = await savedObjectsClient.get(
    'index-pattern',
    indexPatternMeta.id
  );

  const sPanel = {
    indexPatternSavedObject,
    attributes: {
      ...attributes,
      kibanaSavedObjectMeta: { searchSource },
    },
    timerange,
    references,
  };
  return { panel: sPanel, title: attributes.title, visType: 'search' };
}
