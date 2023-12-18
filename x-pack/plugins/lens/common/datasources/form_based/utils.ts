/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormBasedLayer } from '../../../public';
import type {
  GenericIndexPatternColumn,
  MaxIndexPatternColumn,
  MinIndexPatternColumn,
} from './operations';
import type { ReferenceBasedIndexPatternColumn } from './operations/definitions/column_types';
import { isColumnOfType } from './operations/definitions/helpers';

function isMinOrMaxColumn(
  column?: GenericIndexPatternColumn
): column is MaxIndexPatternColumn | MinIndexPatternColumn {
  if (!column) {
    return false;
  }
  return (
    isColumnOfType<MaxIndexPatternColumn>('max', column) ||
    isColumnOfType<MinIndexPatternColumn>('min', column)
  );
}

function isReferenceColumn(
  column: GenericIndexPatternColumn
): column is ReferenceBasedIndexPatternColumn {
  return 'references' in column;
}

export function isSamplingValueEnabled(layer: FormBasedLayer) {
  // Do not use columnOrder here as it needs to check also inside formulas columns
  return !Object.values(layer.columns).some(
    (column) =>
      isMinOrMaxColumn(column) ||
      (isReferenceColumn(column) && isMinOrMaxColumn(layer.columns[column.references[0]]))
  );
}

/**
 * Centralized logic to get the actual random sampling value for a layer
 * @param layer
 * @returns
 */
export function getSamplingValue(layer: FormBasedLayer) {
  return isSamplingValueEnabled(layer) ? layer.sampling ?? 1 : 1;
}
