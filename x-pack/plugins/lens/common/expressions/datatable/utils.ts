/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import { getOriginalId } from './transpose_helpers';

function isValidNumber(value: unknown): boolean {
  return typeof value === 'number' || value == null;
}

export function isNumericFieldForDatatable(currentData: Datatable | undefined, accessor: string) {
  const column = currentData?.columns.find(
    (col) => col.id === accessor || getOriginalId(col.id) === accessor
  );
  // min and max aggs are reporting as number but are actually dates - work around this by checking for the date formatter until this is fixed at the source
  const isNumeric = column?.meta.type === 'number' && column?.meta.params?.id !== 'date';

  return (
    isNumeric &&
    currentData?.rows.every((row) => {
      const val = row[accessor];
      return isValidNumber(val) || (Array.isArray(val) && val.every(isValidNumber));
    })
  );
}
