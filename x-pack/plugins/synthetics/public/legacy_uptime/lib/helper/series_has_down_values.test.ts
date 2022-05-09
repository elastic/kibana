/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { seriesHasDownValues } from './series_has_down_values';

describe('seriesHasDownValues', () => {
  it('identifies that a series does have down values', () => {
    expect(
      seriesHasDownValues([
        { timestamp: 123, down: 23, up: 3 },
        { timestamp: 124, down: 0, up: 26 },
      ])
    ).toBe(true);
  });

  it('identifies that a series does not have down values', () => {
    expect(
      seriesHasDownValues([
        { timestamp: 123, down: 0, up: 0 },
        { timestamp: 125, down: 0, up: 0 },
      ])
    ).toBe(false);
  });
});
