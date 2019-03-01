/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPatternSavedObject } from '../../types';

export async function getIndexPatternById(
  savedObjectsClient: any,
  indexPatternId: string
): Promise<IndexPatternSavedObject> {
  let indexPatternSavedObject: IndexPatternSavedObject;
  const { attributes: indexPatternAttributes } = await savedObjectsClient.get(
    'index-pattern',
    indexPatternId
  );

  try {
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

  return indexPatternSavedObject;
}
