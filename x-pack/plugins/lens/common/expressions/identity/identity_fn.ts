/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildResultColumns } from '@kbn/expressions-plugin/common';
import type { IdentityExpressionFunction } from './types';

export const identityFn: IdentityExpressionFunction['fn'] = (
  input,
  { by, inputColumnId, outputColumnId, outputColumnName }
) => {
  const resultColumns = buildResultColumns(input, outputColumnId, inputColumnId, outputColumnName);

  if (!resultColumns) {
    return input;
  }

  return {
    ...input,
    columns: resultColumns,
    rows: input.rows.map((row) => {
      const newRow = { ...row };
      const currentValue = newRow[inputColumnId];
      newRow[outputColumnId] = currentValue;
      return newRow;
    }),
  };
};
