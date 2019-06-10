/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { unquoteString } from './unquote_string';

export function getFieldType(columns, field) {
  if (!field) {
    return 'null';
  }
  const realField = unquoteString(field);
  const column = columns.find(column => column.name === realField);
  return column ? column.type : 'null';
}
