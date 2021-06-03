/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Datatable } from 'src/plugins/expressions/public';
import { getOriginalId } from './transpose_helpers';

function isValidNumber(value: unknown): boolean {
  return typeof value === 'number' || value == null;
}

/**
 * It checks the configuration and content of the current datatable
 * It returns an object with the following content:
 * * isNumeric: whether the field is numeric
 * * hasNumberValues: whether the table rows contain all values of type number (empty values are ignored)
 * * hasNumericValues: whether the table rows contain numeric compatible values (arrays with numbers are considered valid here, empty values are ignored)
 * @param currentData
 * @param accessor
 * @returns An object containing stats metadata retrieved from both configuration and current data
 */
export function isNumericField(currentData: Datatable | undefined, accessor: string) {
  const isNumeric =
    currentData?.columns.find((col) => col.id === accessor || getOriginalId(col.id) === accessor)
      ?.meta.type === 'number';

  let hasFieldOnlyNumberValues = isNumeric;
  let hasFieldNumericValues = isNumeric;
  for (const row of currentData?.rows || []) {
    const value = row[accessor];
    hasFieldOnlyNumberValues = hasFieldOnlyNumberValues && isValidNumber(value);
    hasFieldNumericValues =
      (hasFieldNumericValues && hasFieldOnlyNumberValues) ||
      (Array.isArray(value) && value.every(isValidNumber));
  }

  return {
    isNumeric,
    hasNumberValues: hasFieldOnlyNumberValues,
    hasNumericValues: hasFieldNumericValues,
  };
}
