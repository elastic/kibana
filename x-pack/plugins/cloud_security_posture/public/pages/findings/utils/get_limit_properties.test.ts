/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLimitProperties } from './get_limit_properties';

describe('getLimitProperties', () => {
  it('less items than limit', () => {
    const { limitedTotalItemCount, isLastLimitedPage } = getLimitProperties(200, 500, 100, 1);

    expect(limitedTotalItemCount).toBe(200);
    expect(isLastLimitedPage).toBe(false);
  });

  it('more items than limit', () => {
    const { limitedTotalItemCount, isLastLimitedPage } = getLimitProperties(600, 500, 100, 4);

    expect(limitedTotalItemCount).toBe(500);
    expect(isLastLimitedPage).toBe(true);
  });

  it('per page calculations are correct', () => {
    const { limitedTotalItemCount, isLastLimitedPage } = getLimitProperties(600, 500, 25, 19);

    expect(limitedTotalItemCount).toBe(500);
    expect(isLastLimitedPage).toBe(true);
  });
});
