/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatNumber } from './number_formatter';

describe('formatNumber()', () => {
  it('number with defaults is successful', () => {
    const format = '1;;';

    expect(formatNumber(format)).toEqual('1');
  });

  // TODO: Add a LOT more tests ...
});
