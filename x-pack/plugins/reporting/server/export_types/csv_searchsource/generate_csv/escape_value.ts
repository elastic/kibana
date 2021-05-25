/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RawValue } from '../types';
import { cellHasFormulas } from './cell_has_formula';

const nonAlphaNumRE = /[^a-zA-Z0-9]/;
const allDoubleQuoteRE = /"/g;

export function createEscapeValue(
  quoteValues: boolean,
  escapeFormulas: boolean
): (val: RawValue) => string {
  return function escapeValue(val: RawValue) {
    if (val && typeof val === 'string') {
      const formulasEscaped = escapeFormulas && cellHasFormulas(val) ? "'" + val : val;
      if (quoteValues && nonAlphaNumRE.test(formulasEscaped)) {
        return `"${formulasEscaped.replace(allDoubleQuoteRE, '""')}"`;
      }
    }

    return val == null ? '' : val.toString();
  };
}
