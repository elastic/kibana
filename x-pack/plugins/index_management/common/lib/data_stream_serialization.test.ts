/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { splitSizeAndUnits } from './data_stream_serialization';

describe('Data stream serialization', () => {
  test('can split size and units from lifecycle string', () => {
    expect(splitSizeAndUnits('1h')).toEqual({ size: '1', unit: 'h' });
    expect(splitSizeAndUnits('20micron')).toEqual({ size: '20', unit: 'micron' });
  });
});
