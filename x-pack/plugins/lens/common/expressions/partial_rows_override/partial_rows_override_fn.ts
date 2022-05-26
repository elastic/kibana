/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatatableRow } from '@kbn/expressions-plugin/common';
import type { PartialRowsOverrideExpressionFunction } from './types';

export const partialRowsOverrideFn: PartialRowsOverrideExpressionFunction['fn'] = (data, {}) => {
  return {
    ...data,
    rows: data.rows.map((row) => {
      if (data.columns.every(({ id }) => row[id] !== undefined)) {
        return row;
      }
      const newRow: DatatableRow = { ...row };
      for (const { id } of data.columns) {
        if (newRow[id] === undefined) {
          newRow[id] = '';
        }
      }

      return newRow;
    }),
  };
};
