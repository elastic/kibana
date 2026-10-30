/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { goalScorePassed } from './scoring';
import {
  scoreOrcaControl,
  scoreOrcaHallucination,
  scoreOrcaRcaAccuracy,
  shrinkQuietWindow,
} from './orca_scoring';

describe('ORCA RCA accuracy', () => {
  it('is 0 when the best hypothesis names only one of several plausible flags', () => {
    // goal_pass scores the single best-matching hypothesis and would pass this case.
    expect(goalScorePassed(4)).toBe(true);
    expect(
      scoreOrcaRcaAccuracy({
        plausibleFlags: ['productCatalogFailure', 'recommendationCacheFailure'],
        namedFlags: ['productCatalogFailure'],
      })
    ).toBe(0);
  });

  it('is 1 only when every plausible flag is named', () => {
    expect(
      scoreOrcaRcaAccuracy({
        plausibleFlags: ['productCatalogFailure', 'recommendationCacheFailure'],
        namedFlags: ['recommendationCacheFailure', 'productCatalogFailure'],
      })
    ).toBe(1);
  });

  it('is 0 when the plausible set is empty', () => {
    expect(scoreOrcaRcaAccuracy({ plausibleFlags: [], namedFlags: [] })).toBe(0);
  });

  it('counts a flag named without its variant', () => {
    expect(
      scoreOrcaRcaAccuracy({
        plausibleFlags: ['productCatalogFailure:on'],
        namedFlags: ['productCatalogFailure'],
      })
    ).toBe(1);
  });

  it('rejects a different variant of the same flag', () => {
    expect(
      scoreOrcaRcaAccuracy({
        plausibleFlags: ['productCatalogFailure:on'],
        namedFlags: ['productCatalogFailure:off'],
      })
    ).toBe(0);
  });
});

describe('ORCA hallucination', () => {
  it('stays 0 when a true flag is named alongside an extra cause', () => {
    expect(
      scoreOrcaHallucination({
        plausibleFlags: ['productCatalogFailure'],
        namedCauses: ['productCatalogFailure', 'paymentServiceMemoryLeak'],
      })
    ).toBe(0);
  });

  it('is 1 when every named cause misses the plausible set', () => {
    expect(
      scoreOrcaHallucination({
        plausibleFlags: ['productCatalogFailure'],
        namedCauses: ['paymentServiceMemoryLeak'],
      })
    ).toBe(1);
  });

  it('is 0 when every named cause is in the plausible set', () => {
    expect(
      scoreOrcaHallucination({
        plausibleFlags: ['productCatalogFailure'],
        namedCauses: ['productCatalogFailure'],
      })
    ).toBe(0);
  });

  it('is 0 when the report names no cause', () => {
    expect(
      scoreOrcaHallucination({
        plausibleFlags: ['productCatalogFailure'],
        namedCauses: [],
      })
    ).toBe(0);
  });
});

describe('ORCA quiet window', () => {
  it('shrinks each timestamped side by ten minutes', () => {
    expect(
      shrinkQuietWindow({
        start: '2026-04-19T16:00:00.000Z',
        end: '2026-04-19T17:00:00.000Z',
      })
    ).toEqual({
      start: '2026-04-19T16:10:00.000Z',
      end: '2026-04-19T16:50:00.000Z',
    });
  });
});

describe('ORCA control', () => {
  it('passes an empty report', () => {
    expect(scoreOrcaControl({ emptyReport: true, incidentInsideQuietWindow: false })).toBe(1);
  });

  it('fails when a report places an incident inside the quiet window', () => {
    expect(scoreOrcaControl({ emptyReport: false, incidentInsideQuietWindow: true })).toBe(0);
  });

  it('passes a non-empty report that keeps the incident outside the quiet window', () => {
    expect(scoreOrcaControl({ emptyReport: false, incidentInsideQuietWindow: false })).toBe(1);
  });
});
