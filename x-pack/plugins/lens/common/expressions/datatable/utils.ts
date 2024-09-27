/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Datatable, type DatatableColumnMeta } from '@kbn/expressions-plugin/common';
import { getOriginalId } from './transpose_helpers';

/**
 * Returns true for numerical fields, excluding ranges
 */
export function isNumericField(meta?: DatatableColumnMeta): boolean {
  return meta?.type === 'number' && meta.params?.id !== 'range';
}

/**
 * Returns true for numerical fields, excluding ranges
 */
export function isNumericFieldForDatatable(table: Datatable | undefined, accessor: string) {
  const meta = getFieldMetaFromDatatable(table, accessor);
  return isNumericField(meta);
}

export function getFieldMetaFromDatatable(table: Datatable | undefined, accessor: string) {
  return table?.columns.find((col) => col.id === accessor || getOriginalId(col.id) === accessor)
    ?.meta;
}
