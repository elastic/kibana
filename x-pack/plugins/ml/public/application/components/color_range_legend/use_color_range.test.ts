/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { influencerColorScaleFactory } from './use_color_range';

describe('useColorRange', () => {
  test('influencerColorScaleFactory(1)', () => {
    const influencerColorScale = influencerColorScaleFactory(1);

    expect(influencerColorScale(0)).toBe(0);
    expect(influencerColorScale(0.1)).toBe(0.1);
    expect(influencerColorScale(0.2)).toBe(0.2);
    expect(influencerColorScale(0.3)).toBe(0.3);
    expect(influencerColorScale(0.4)).toBe(0.4);
    expect(influencerColorScale(0.5)).toBe(0.5);
    expect(influencerColorScale(0.6)).toBe(0.6);
    expect(influencerColorScale(0.7)).toBe(0.7);
    expect(influencerColorScale(0.8)).toBe(0.8);
    expect(influencerColorScale(0.9)).toBe(0.9);
    expect(influencerColorScale(1)).toBe(1);
  });

  test('influencerColorScaleFactory(2)', () => {
    const influencerColorScale = influencerColorScaleFactory(2);

    expect(influencerColorScale(0)).toBe(0);
    expect(influencerColorScale(0.1)).toBe(0);
    expect(influencerColorScale(0.2)).toBe(0);
    expect(influencerColorScale(0.3)).toBe(0);
    expect(influencerColorScale(0.4)).toBe(0);
    expect(influencerColorScale(0.5)).toBe(0);
    expect(influencerColorScale(0.6)).toBe(0.04999999999999999);
    expect(influencerColorScale(0.7)).toBe(0.09999999999999998);
    expect(influencerColorScale(0.8)).toBe(0.15000000000000002);
    expect(influencerColorScale(0.9)).toBe(0.2);
    expect(influencerColorScale(1)).toBe(0.25);
  });

  test('influencerColorScaleFactory(3)', () => {
    const influencerColorScale = influencerColorScaleFactory(3);

    expect(influencerColorScale(0)).toBe(0);
    expect(influencerColorScale(0.1)).toBe(0);
    expect(influencerColorScale(0.2)).toBe(0);
    expect(influencerColorScale(0.3)).toBe(0);
    expect(influencerColorScale(0.4)).toBe(0.05000000000000003);
    expect(influencerColorScale(0.5)).toBe(0.125);
    expect(influencerColorScale(0.6)).toBe(0.2);
    expect(influencerColorScale(0.7)).toBe(0.27499999999999997);
    expect(influencerColorScale(0.8)).toBe(0.35000000000000003);
    expect(influencerColorScale(0.9)).toBe(0.425);
    expect(influencerColorScale(1)).toBe(0.5);
  });
});
