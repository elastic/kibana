/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keyBy } from 'lodash';
import { IndexPatternField } from '../../types';
import { documentField } from './document_field';

export function getFieldByNameFactory(
  newFields: IndexPatternField[],
  addRecordsField: boolean = true
) {
  const fieldsLookup = keyBy(newFields, 'name');
  if (addRecordsField) {
    fieldsLookup[documentField.name] = documentField;
  }
  return (name: string) => fieldsLookup[name];
}
