/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { formatStatValue } from './format_stat_value';
import { Stat } from '../typings';

describe('formatStatValue', () => {
  it('formats value as number', () => {
    const stat = {
      type: 'number',
      label: 'numeral stat',
      value: 1000,
    } as Stat;
    expect(formatStatValue(stat)).toEqual('1k');
  });
  it('formats value as bytes', () => {
    expect(
      formatStatValue({
        type: 'bytesPerSecond',
        label: 'bytes stat',
        value: 1,
      } as Stat)
    ).toEqual('1.0B/s');
    expect(
      formatStatValue({
        type: 'bytesPerSecond',
        label: 'bytes stat',
        value: 1048576,
      } as Stat)
    ).toEqual('1.0MB/s');
    expect(
      formatStatValue({
        type: 'bytesPerSecond',
        label: 'bytes stat',
        value: 1073741824,
      } as Stat)
    ).toEqual('1.0GB/s');
  });
  it('formats value as percent', () => {
    const stat = {
      type: 'percent',
      label: 'percent stat',
      value: 0.841,
    } as Stat;
    expect(formatStatValue(stat)).toEqual('84.1%');
  });
});
