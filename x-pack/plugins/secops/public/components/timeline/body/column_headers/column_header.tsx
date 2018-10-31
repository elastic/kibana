/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ColumnId } from '../column_id';

export type ColumnHeaderType = 'not-filtered' | 'text-filter';

/** The specification of a column header */
export interface ColumnHeader {
  id: ColumnId;
  columnHeaderType: ColumnHeaderType;
  minWidth: number;
  placeholder?: string;
  text: string;
}
