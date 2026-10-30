/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import type { ESQLAstQueryExpression } from '@elastic/esql/types';

export type StrictParseResult =
  | { parsed: true; root: ESQLAstQueryExpression }
  | { parsed: false; errors: string[] };

// A recovery AST with parser errors does not count as valid.
export const parseEsqlStrict = (esql: string): StrictParseResult => {
  const { root, errors } = Parser.parse(esql);
  if (errors.length === 0) {
    return { parsed: true, root };
  }
  return { parsed: false, errors: errors.map((error) => error.message) };
};
