/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPatternSavedObject } from '../../csv/types';
import { SavedObjectReference, SavedSearchObjectAttributesJSON, SearchSource } from '../types';

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
    const { attributes } = await savedObjectsClient.get('index-pattern', indexPatternId);
    const { fields, title, timeFieldName } = attributes;
    const parsedFields = fields ? JSON.parse(fields) : [];

    indexPatternSavedObject = {
      fields: parsedFields,
      title,
      timeFieldName,
      attributes,
    };
  } catch (err) {
    throw new Error(`Could not get index pattern saved object! ${err}`);
  }
  return { indexPatternSavedObject, searchSource };
}
