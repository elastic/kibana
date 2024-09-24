/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import { getOriginalId } from './transpose_helpers';

export function isNumericFieldForDatatable(table: Datatable | undefined, accessor: string) {
  return getFieldTypeFromDatatable(table, accessor) === 'number';
}

export function getFieldTypeFromDatatable(table: Datatable | undefined, accessor: string) {
  return table?.columns.find((col) => col.id === accessor || getOriginalId(col.id) === accessor)
    ?.meta.type;
}
