/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Datatable,
  ExpressionFunctionDefinition,
} from '../../../../../../src/plugins/expressions';

export interface TableSortingArgs {
  type: Array<'alphabetical' | 'none' | 'column' | 'terms'>;
  columnId: string[];
  direction: Array<'asc' | 'desc'>;
  terms: string[];
}

export type TableSortingExpressionFunction = ExpressionFunctionDefinition<
  'lens_table_sorting',
  Datatable,
  TableSortingArgs,
  Datatable | Promise<Datatable>
>;
