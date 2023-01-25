/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EQUATION_REGEX } from './validation';

describe('Metric Threshold Validation', () => {
  describe('valid equations', () => {
    const validExpression = [
      '(A + B) / 100',
      '(A - B) * 100',
      'A > 1 ? A : B',
      'A <= 1 ? A : B',
      'A && B || C',
    ];
    validExpression.forEach((exp) => {
      it(exp, () => {
        expect(exp.match(EQUATION_REGEX)).toBeFalsy();
      });
    });
  });
  describe('invalid equations', () => {
    const validExpression = ['Math.round(A + B) / 100', '(A^2 - B) * 100'];
    validExpression.forEach((exp) => {
      it(exp, () => {
        expect(exp.match(EQUATION_REGEX)).toBeTruthy();
      });
    });
  });
});
