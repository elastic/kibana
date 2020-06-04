/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimeRangeParams } from '../../../../types';
import {
  SavedObjectMeta,
  SavedObjectReference,
  SavedSearchObjectAttributes,
  SearchPanel,
} from '../../types';

interface SearchPanelData {
  title: string;
  visType: string;
  panel: SearchPanel;
}

export async function createJobSearch(
  timerange: TimeRangeParams,
  attributes: SavedSearchObjectAttributes,
  references: SavedObjectReference[],
  kibanaSavedObjectMeta: SavedObjectMeta
): Promise<SearchPanelData> {
  const { searchSource } = kibanaSavedObjectMeta;
  if (!searchSource || !references) {
    throw new Error('The saved search object is missing configuration fields!');
  }

  const indexPatternMeta = references.find(
    (ref: SavedObjectReference) => ref.type === 'index-pattern'
  );
  if (!indexPatternMeta) {
    throw new Error('Could not find index pattern for the saved search!');
  }

  const sPanel = {
    attributes: {
      ...attributes,
      kibanaSavedObjectMeta: { searchSource },
    },
    indexPatternSavedObjectId: indexPatternMeta.id,
    timerange,
  };

  return { panel: sPanel, title: attributes.title, visType: 'search' };
}
