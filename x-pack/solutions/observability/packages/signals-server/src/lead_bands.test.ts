/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { anomalySignalBand, changePointSignalBand, timingBand } from './lead_bands';

describe('changePointSignalBand', () => {
  it('bands p-values without turning them into one score', () => {
    expect(changePointSignalBand(0.001)).toBe('strong');
    expect(changePointSignalBand(0.02)).toBe('moderate');
    expect(changePointSignalBand(0.2)).toBe('weak');
    expect(changePointSignalBand(undefined)).toBe('unknown');
    expect(changePointSignalBand(NaN)).toBe('unknown');
  });
});

describe('anomalySignalBand', () => {
  it('bands ML record scores into strong, moderate, weak, and unknown', () => {
    expect(anomalySignalBand(75)).toBe('strong');
    expect(anomalySignalBand('55')).toBe('strong');
    expect(anomalySignalBand(30)).toBe('moderate');
    expect(anomalySignalBand(10)).toBe('weak');
    expect(anomalySignalBand(0)).toBe('unknown');
    expect(anomalySignalBand(null)).toBe('unknown');
    expect(anomalySignalBand(undefined)).toBe('unknown');
  });
});

describe('timingBand', () => {
  const start = '2026-11-02T11:00:00.000Z';
  const end = '2026-11-02T12:00:00.000Z';

  it('places a timestamp before, during, or after the anchor window', () => {
    expect(timingBand('2026-11-02T10:30:00.000Z', start, end)).toBe('before');
    expect(timingBand('2026-11-02T11:30:00.000Z', start, end)).toBe('during');
    expect(timingBand('2026-11-02T12:30:00.000Z', start, end)).toBe('after');
  });

  it('is unknown without a parseable timestamp', () => {
    expect(timingBand(undefined, start, end)).toBe('unknown');
    expect(timingBand('not a date', start, end)).toBe('unknown');
  });
});
