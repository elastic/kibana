/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  IndexPatternSavedObject,
  SavedObjectReference,
  SavedSearchObjectAttributesJSON,
  SearchSource,
} from '../../types';

export async function getDataSource(
  savedObjectsClient: any,
  indexPatternId?: string,
  savedSearchObjectId?: string
): Promise<{
  indexPatternSavedObject: IndexPatternSavedObject;
  searchSource: SearchSource | null;
}> {
  let indexPatternSavedObject: IndexPatternSavedObject;
  let searchSource: SearchSource | null = null;

  if (savedSearchObjectId) {
    try {
      const { attributes, references } = (await savedObjectsClient.get(
        'search',
        savedSearchObjectId
      )) as { attributes: SavedSearchObjectAttributesJSON; references: SavedObjectReference[] };
      searchSource = JSON.parse(attributes.kibanaSavedObjectMeta.searchSourceJSON);
      const { id: indexPatternFromSearchId } = references.find(
        ({ type }) => type === 'index-pattern'
      ) as { id: string };
      ({ indexPatternSavedObject } = await getDataSource(
        savedObjectsClient,
        indexPatternFromSearchId
      ));
      return { searchSource, indexPatternSavedObject };
    } catch (err) {
      throw new Error(`Could not get saved search info! ${err}`);
    }
  }

  try {
    const { attributes: indexPatternAttributes } = await savedObjectsClient.get(
      'index-pattern',
      indexPatternId
    );
    let fields = '[]';
    let fieldFormatMap = '{}';
    if (indexPatternAttributes.fields) {
      fields = JSON.parse(indexPatternAttributes.fields);
    }
    if (indexPatternAttributes.fieldFormatMap) {
      fieldFormatMap = JSON.parse(indexPatternAttributes.fieldFormatMap);
    }
    indexPatternSavedObject = { ...indexPatternAttributes, fields, fieldFormatMap };
  } catch (err) {
    throw new Error(`Could not get index pattern saved object! ${err}`);
  }

  return { indexPatternSavedObject, searchSource };
}
