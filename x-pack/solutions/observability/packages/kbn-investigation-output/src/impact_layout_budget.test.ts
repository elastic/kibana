/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvidenceChart } from '@kbn/significant-events-schema';
import { estimateTextHeight, getVisibleImpactParts } from './impact_layout_budget';

const chart: EvidenceChart = {
  type: 'bar',
  title: 'Failed requests',
  x_axis: { type: 'time' },
  y_axis: {},
  series: [{ name: 'failures', points: [{ x: '2026-07-28T14:00:00Z', y: 3 }] }],
};

const entities = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ name: `service-${index}` }));

describe('estimateTextHeight', () => {
  it('counts one line per 45 characters, 20px each', () => {
    expect(estimateTextHeight('')).toBe(0);
    expect(estimateTextHeight('x'.repeat(45))).toBe(20);
    expect(estimateTextHeight('x'.repeat(46))).toBe(40);
  });
});

describe('getVisibleImpactParts', () => {
  it('shows everything when it fits the budget', () => {
    expect(
      getVisibleImpactParts({
        summary: 'Checkout failed.',
        evidence: { description: 'Failed requests per minute.', chart },
        entities: entities(2),
      })
    ).toEqual({
      showEvidenceChart: true,
      showEvidenceDescription: true,
      visibleEntityCount: 2,
      isTruncated: false,
    });
  });

  it('hides what follows the first part that does not fit', () => {
    const parts = getVisibleImpactParts({
      // 9 lines = 180px, plus the 260px chart leaves no room for a 5-line description.
      summary: 'x'.repeat(400),
      evidence: { description: 'y'.repeat(200), chart },
      entities: entities(1),
    });

    expect(parts).toEqual({
      showEvidenceChart: true,
      showEvidenceDescription: false,
      visibleEntityCount: 0,
      isTruncated: true,
    });
  });

  it('shows only the entity rows that fit', () => {
    const parts = getVisibleImpactParts({ summary: 'Checkout failed.', entities: entities(20) });

    expect(parts.visibleEntityCount).toBeGreaterThan(0);
    expect(parts.visibleEntityCount).toBeLessThan(20);
    expect(parts.isTruncated).toBe(true);
  });

  it('always shows the summary, even when it alone exceeds the budget', () => {
    const parts = getVisibleImpactParts({
      summary: 'x'.repeat(2000),
      evidence: { description: 'Failed requests.', chart },
    });

    expect(parts).toEqual({
      showEvidenceChart: false,
      showEvidenceDescription: false,
      visibleEntityCount: 0,
      isTruncated: true,
    });
  });
});
