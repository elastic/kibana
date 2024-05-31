/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFormattedSelection } from '.';

describe('getFormattedSelection', () => {
  it('displays only one unit if from and to share the same unit', () => {
    expect(getFormattedSelection([10000, 100000])).toEqual('10 - 100 ms');
  });

  it('displays two units when from and to have different units', () => {
    expect(getFormattedSelection([100000, 1000000000])).toEqual('100 ms - 17 min');
  });
});
