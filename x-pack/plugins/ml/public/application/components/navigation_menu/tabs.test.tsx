/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTabs } from './tabs';

describe('Navigation Menu: Tabs', () => {
  test('getTabs() always returns an array', () => {
    const tabs1 = getTabs('anomaly_detection', false);
    expect(Array.isArray(tabs1)).toBeTruthy();
    expect(tabs1).toHaveLength(4);

    const tabs2 = getTabs('access-denied', false);
    expect(Array.isArray(tabs2)).toBeTruthy();
    expect(tabs2).toHaveLength(0);

    const tabs3 = getTabs('datavisualizer', false);
    expect(Array.isArray(tabs3)).toBeTruthy();
    expect(tabs3).toHaveLength(0);
  });
});
