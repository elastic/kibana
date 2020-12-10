/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { keyBy } from 'lodash';
import { IndexPatternField, IndexPatternPrivateState } from './types';

export function fieldExists(
  existingFields: IndexPatternPrivateState['existingFields'],
  indexPatternTitle: string,
  fieldName: string
) {
  return existingFields[indexPatternTitle] && existingFields[indexPatternTitle][fieldName];
}

export function getFieldByNameFactory(newFields: IndexPatternField[]) {
  const fieldsLookup = keyBy(newFields, 'name');
  return (name: string) => fieldsLookup[name];
}
