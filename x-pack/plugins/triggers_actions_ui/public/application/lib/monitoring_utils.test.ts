/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  getFormattedSuccessRatio,
  getFormattedDuration,
  getFormattedMilliseconds,
} from './monitoring_utils';

describe('monitoring_utils', () => {
  it('should return a decimal as a percent', () => {
    expect(getFormattedSuccessRatio(0.66)).toEqual('66%');
    expect(getFormattedSuccessRatio(0.75345345345345)).toEqual('75%');
  });

  it('should return a formatted duration', () => {
    expect(getFormattedDuration(0)).toEqual('00:00');
    expect(getFormattedDuration(100.111)).toEqual('00:00');
    expect(getFormattedDuration(500)).toEqual('00:01');
    expect(getFormattedDuration(50000)).toEqual('00:50');
    expect(getFormattedDuration(59900)).toEqual('01:00');
    expect(getFormattedDuration(500000)).toEqual('08:20');
    expect(getFormattedDuration(5000000)).toEqual('83:20');
    expect(getFormattedDuration(50000000)).toEqual('833:20');
  });

  it('should format a duration as an integer', () => {
    expect(getFormattedMilliseconds(0)).toEqual('0 ms');
    expect(getFormattedMilliseconds(100.5555)).toEqual('101 ms');
    expect(getFormattedMilliseconds(99.1111)).toEqual('99 ms');
  });
});
