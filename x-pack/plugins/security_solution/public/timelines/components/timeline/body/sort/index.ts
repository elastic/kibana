/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Direction } from '../../../../../graphql/types';
import { ColumnId } from '../column_id';

/** Specifies a column's sort direction */
export type SortDirection = 'none' | Direction;

/** Specifies which column the timeline is sorted on */
export interface Sort {
  columnId: ColumnId;
  columnType: string;
  sortDirection: SortDirection;
}
