/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { formatStatValue } from './format_stat_value';

describe('formatStatValue', () => {
  it('formats value as numeral', () => {
    const stat = {
      label: 'numeral stat',
      value: 1000,
    };
    expect(formatStatValue(stat)).toEqual('1k');
  });
  it('formats value as bytes', () => {
    const stat = {
      label: 'bytes stat',
      bytes: 11.4,
    };
    expect(formatStatValue(stat)).toEqual('11.4 Mb/s');
  });
  it('formats value as percentage', () => {
    const stat = {
      label: 'bytes stat',
      pct: 0.841,
    };
    expect(formatStatValue(stat)).toEqual('84.1%');
  });
});
