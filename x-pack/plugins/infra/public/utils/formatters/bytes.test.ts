/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraWaffleMapDataFormat } from '../../lib/lib';
import { createBytesFormatter } from './bytes';
describe('createDataFormatter', () => {
  it('should format bytes as bytesDecimal', () => {
    const formatter = createBytesFormatter(InfraWaffleMapDataFormat.bytesDecimal);
    expect(formatter(1000000)).toBe('1MB');
  });
  it('should format bytes as bitsDecimal', () => {
    const formatter = createBytesFormatter(InfraWaffleMapDataFormat.bitsDecimal);
    expect(formatter(1000000)).toBe('8Mbit');
  });
  it('should format bytes as abbreviatedNumber', () => {
    const formatter = createBytesFormatter(InfraWaffleMapDataFormat.abbreviatedNumber);
    expect(formatter(1000000)).toBe('1M');
  });
});
