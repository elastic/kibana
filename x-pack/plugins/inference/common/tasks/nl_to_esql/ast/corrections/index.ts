/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLAstQueryExpression } from '@kbn/esql-ast';
import type { QueryCorrection } from './types';
import { applyTimespanLiteralsCorrections } from './timespan_literals';

export type { QueryCorrection } from './types';

export const correctAll = (query: ESQLAstQueryExpression): QueryCorrection[] => {
  const corrections: QueryCorrection[] = [];
  corrections.push(...applyTimespanLiteralsCorrections(query));
  return corrections;
};
