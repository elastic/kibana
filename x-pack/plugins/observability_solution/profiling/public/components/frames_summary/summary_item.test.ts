/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getValueLable } from './summary_item';

describe('Summary item', () => {
  it('returns value and percentage', () => {
    expect(getValueLable('10', '1%')).toEqual('10 (1%)');
  });

  it('returns value', () => {
    expect(getValueLable('10', undefined)).toEqual('10');
  });

  it('returns value when perc is an empty string', () => {
    expect(getValueLable('10', '')).toEqual('10');
  });
});
