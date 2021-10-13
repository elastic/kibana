/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatMillisForDisplay } from './execution_duration_utils';

describe('formatMillisForDisplay', () => {
  it('should return 0 for undefined', () => {
    expect(formatMillisForDisplay(undefined)).toEqual('00:00:00.000');
  });

  it('should correctly format millisecond duration in milliseconds', () => {
    expect(formatMillisForDisplay(845)).toEqual('00:00:00.845');
  });

  it('should correctly format second duration in milliseconds', () => {
    expect(formatMillisForDisplay(45200)).toEqual('00:00:45.200');
  });

  it('should correctly format minute duration in milliseconds', () => {
    expect(formatMillisForDisplay(122450)).toEqual('00:02:02.450');
  });

  it('should correctly format hour duration in milliseconds', () => {
    expect(formatMillisForDisplay(3634601)).toEqual('01:00:34.601');
  });
});
