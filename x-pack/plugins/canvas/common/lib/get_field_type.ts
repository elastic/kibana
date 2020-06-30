/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DatatableColumn } from '../../types';
import { unquoteString } from './unquote_string';

/**
 * Get the type for the column with the given name
 *
 * @argument columns Array of all columns
 * @field Name of the column that we are looking for the type of
 * @returns The column type or the string 'null'
 */
export function getFieldType(columns: DatatableColumn[], field?: string): string {
  if (!field) {
    return 'null';
  }
  const realField = unquoteString(field);
  const column = columns.find((dataTableColumn) => dataTableColumn.name === realField);
  return column ? column.type : 'null';
}
