/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ExpressionFunctionDefinition,
  ExpressionValueSearchContext,
  KibanaDatatable,
} from 'src/plugins/expressions/common';

export interface ExistingFields {
  indexPatternTitle: string;
  existingFieldNames: string[];
}

export interface DateRange {
  fromDate: string;
  toDate: string;
}

export interface LensMultiTable {
  type: 'lens_multitable';
  tables: Record<string, KibanaDatatable>;
  dateRange?: {
    fromDate: Date;
    toDate: Date;
  };
}

interface MergeTables {
  layerIds: string[];
  tables: KibanaDatatable[];
}

export type MergeTablesExpressionFunctionDefinition = ExpressionFunctionDefinition<
  'lens_merge_tables',
  ExpressionValueSearchContext | null,
  MergeTables,
  LensMultiTable
>;
