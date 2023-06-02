/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getComparatorScript } from './comparator';
import { Comparator } from './comparator_types';

describe('getComparatorScript', () => {
  it('correctly returns script when comparator is LT', () => {
    expect(getComparatorScript(Comparator.LT, [10], 'fieldName')).toEqual(`fieldName < 10L`);
  });
  it('correctly returns script when comparator is LT_OR_EQ', () => {
    expect(getComparatorScript(Comparator.LT_OR_EQ, [10], 'fieldName')).toEqual(`fieldName <= 10L`);
  });
  it('correctly returns script when comparator is GT', () => {
    expect(getComparatorScript(Comparator.GT, [10], 'fieldName')).toEqual(`fieldName > 10L`);
  });
  it('correctly returns script when comparator is GT_OR_EQ', () => {
    expect(getComparatorScript(Comparator.GT_OR_EQ, [10], 'fieldName')).toEqual(`fieldName >= 10L`);
  });
  it('correctly returns script when comparator is BETWEEN', () => {
    expect(getComparatorScript(Comparator.BETWEEN, [10, 100], 'fieldName')).toEqual(
      `fieldName >= 10L && fieldName <= 100L`
    );
  });
  it('correctly returns script when comparator is NOT_BETWEEN', () => {
    expect(getComparatorScript(Comparator.NOT_BETWEEN, [10, 100], 'fieldName')).toEqual(
      `fieldName < 10L || fieldName > 100L`
    );
  });
  it('correctly returns script when threshold is float', () => {
    expect(getComparatorScript(Comparator.LT, [3.5454], 'fieldName')).toEqual(`fieldName < 3.5454`);
  });
  it('throws error when threshold is empty', () => {
    expect(() => {
      getComparatorScript(Comparator.LT, [], 'fieldName');
    }).toThrowErrorMatchingInlineSnapshot(`"Threshold value required"`);
  });
  it('throws error when comparator requires two thresholds and two thresholds are not defined', () => {
    expect(() => {
      getComparatorScript(Comparator.BETWEEN, [1], 'fieldName');
    }).toThrowErrorMatchingInlineSnapshot(`"Threshold values required"`);
  });
});
