/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { numberFloatRt } from './number_float_rt';
import { isRight } from 'fp-ts/lib/Either';

describe('numberFloatRt', () => {
  it('does not accept empty values', () => {
    expect(isRight(numberFloatRt.decode(undefined))).toBe(false);
    expect(isRight(numberFloatRt.decode(null))).toBe(false);
    expect(isRight(numberFloatRt.decode(''))).toBe(false);
  });

  it('should only accept stringified numbers', () => {
    expect(isRight(numberFloatRt.decode('0.5'))).toBe(true);
    expect(isRight(numberFloatRt.decode(0.5))).toBe(false);
  });

  it('checks if the number falls within 0, 1', () => {
    expect(isRight(numberFloatRt.decode('0'))).toBe(true);
    expect(isRight(numberFloatRt.decode('0.5'))).toBe(true);
    expect(isRight(numberFloatRt.decode('-0.1'))).toBe(false);
    expect(isRight(numberFloatRt.decode('1.1'))).toBe(false);
    expect(isRight(numberFloatRt.decode(NaN))).toBe(false);
  });

  it('checks whether the number of decimals is 3', () => {
    expect(isRight(numberFloatRt.decode('1'))).toBe(true);
    expect(isRight(numberFloatRt.decode('0.9'))).toBe(true);
    expect(isRight(numberFloatRt.decode('0.99'))).toBe(true);
    expect(isRight(numberFloatRt.decode('0.999'))).toBe(true);
    expect(isRight(numberFloatRt.decode('0.9999'))).toBe(false);
  });
});
