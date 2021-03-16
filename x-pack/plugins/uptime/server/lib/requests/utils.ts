/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import {
  IFieldType,
  SavedObject,
  IndexPatternAttributes,
} from '../../../../../../src/plugins/data/common';

export const getFieldByName = (
  fieldName: string,
  indexPattern: SavedObject<IndexPatternAttributes>
): IFieldType | undefined => {
  const fields: IFieldType[] = indexPattern && JSON.parse(indexPattern.attributes.fields);
  const field = fields && fields.find((f) => f.name === fieldName);

  return field;
};

export const findIndexPatternById = async (
  savedObjectsClient: SavedObjectsClientContract,
  index: string
): Promise<SavedObject<IndexPatternAttributes> | undefined> => {
  const savedObjectsResponse = await savedObjectsClient.find<IndexPatternAttributes>({
    type: 'index-pattern',
    fields: ['fields'],
    search: `"${index}"`,
    searchFields: ['title'],
  });

  if (savedObjectsResponse.total > 0) {
    return savedObjectsResponse.saved_objects[0];
  }
};
