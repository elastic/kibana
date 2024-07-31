/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { floatThreeDecimalPlacesRt } from './float_three_decimal_places_rt';
import { isRight } from 'fp-ts/lib/Either';

describe('floatThreeDecimalPlacesRt', () => {
  it('does not accept empty values', () => {
    expect(isRight(floatThreeDecimalPlacesRt.decode(undefined))).toBe(false);
    expect(isRight(floatThreeDecimalPlacesRt.decode(null))).toBe(false);
    expect(isRight(floatThreeDecimalPlacesRt.decode(''))).toBe(false);
  });

  it('should only accept stringified numbers', () => {
    expect(isRight(floatThreeDecimalPlacesRt.decode('0.5'))).toBe(true);
    expect(isRight(floatThreeDecimalPlacesRt.decode(0.5))).toBe(false);
  });

  it('checks if the number falls within 0, 1', () => {
    expect(isRight(floatThreeDecimalPlacesRt.decode('0'))).toBe(true);
    expect(isRight(floatThreeDecimalPlacesRt.decode('0.5'))).toBe(true);
    expect(isRight(floatThreeDecimalPlacesRt.decode('-0.1'))).toBe(false);
    expect(isRight(floatThreeDecimalPlacesRt.decode('1.1'))).toBe(false);
    expect(isRight(floatThreeDecimalPlacesRt.decode(NaN))).toBe(false);
  });

  it('checks whether the number of decimals is 3', () => {
    expect(isRight(floatThreeDecimalPlacesRt.decode('1'))).toBe(true);
    expect(isRight(floatThreeDecimalPlacesRt.decode('0.9'))).toBe(true);
    expect(isRight(floatThreeDecimalPlacesRt.decode('0.99'))).toBe(true);
    expect(isRight(floatThreeDecimalPlacesRt.decode('0.999'))).toBe(true);
    expect(isRight(floatThreeDecimalPlacesRt.decode('0.9999'))).toBe(false);
  });
});
