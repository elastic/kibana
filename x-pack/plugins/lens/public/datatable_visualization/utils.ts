/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Datatable } from 'src/plugins/expressions/public';
import { getOriginalId } from './transpose_helpers';

export function isNumericField(currentData: Datatable | undefined, accessor: string) {
  const isNumeric =
    currentData?.columns.find((col) => col.id === accessor || getOriginalId(col.id) === accessor)
      ?.meta.type === 'number';

  // check for array values
  const hasFieldNumericValues =
    isNumeric &&
    currentData?.rows.every(({ [accessor]: value }) => typeof value === 'number' || value == null);

  return { isNumeric, hasAllNumericValues: hasFieldNumericValues };
}
