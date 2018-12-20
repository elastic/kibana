/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse } from 'tinymath';

export function isColumnReference(mathExpression) {
  if (mathExpression == null) {
    mathExpression = 'null';
  }
  const parsedMath = parse(mathExpression);
  return typeof parsedMath === 'string';
}
