/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse } from '@kbn/tinymath';

export function isColumnReference(mathExpression: string | null): boolean {
  if (mathExpression == null) {
    mathExpression = 'null';
  }
  const parsedMath = parse(mathExpression);
  return typeof parsedMath !== 'number' && parsedMath.type === 'variable';
}
