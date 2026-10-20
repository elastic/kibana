/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReplayMarker } from '../types';
import { layoutMarkers } from './marker_layout';

const marker = (id: string, kind: ReplayMarker['kind'], timestamp: number): ReplayMarker => ({
  id,
  kind,
  timestamp,
  label: id,
});

const options = { startTimestamp: 1_000, endTimestamp: 11_000, widthPx: 1_000 };

describe('layoutMarkers', () => {
  it('positions markers proportionally on the timeline', () => {
    const buckets = layoutMarkers(
      [marker('a', 'click', 1_000), marker('b', 'error', 6_000)],
      options
    );

    expect(buckets.map(({ offsetMs, positionPx }) => [offsetMs, positionPx])).toEqual([
      [0, 0],
      [5_000, 500],
    ]);
  });

  it('groups markers closer than the minimum spacing and keeps all of them', () => {
    const buckets = layoutMarkers(
      [marker('a', 'click', 1_000), marker('b', 'click', 1_050), marker('c', 'click', 6_000)],
      options
    );

    expect(buckets).toHaveLength(2);
    expect(buckets[0].markers.map(({ id }) => id)).toEqual(['a', 'b']);
    expect(buckets[0].offsetMs).toBe(0);
  });

  it('shows the highest-priority kind of a bucket so errors are never hidden by clicks', () => {
    const [bucket] = layoutMarkers(
      [marker('c', 'click', 1_000), marker('n', 'navigation', 1_020), marker('e', 'error', 1_040)],
      options
    );

    expect(bucket.kind).toBe('error');
    expect(bucket.markers).toHaveLength(3);
  });

  it('prefers navigation over click', () => {
    const [bucket] = layoutMarkers(
      [marker('c', 'click', 1_000), marker('n', 'navigation', 1_020)],
      options
    );

    expect(bucket.kind).toBe('navigation');
  });

  it('clamps markers just outside the recording and drops markers far outside it', () => {
    const buckets = layoutMarkers(
      [
        marker('early', 'click', 500),
        marker('late', 'click', 11_800),
        marker('too-early', 'click', -5_000),
        marker('too-late', 'click', 20_000),
      ],
      options
    );

    expect(buckets.map(({ markers, offsetMs }) => [markers[0].id, offsetMs])).toEqual([
      ['early', 0],
      ['late', 10_000],
    ]);
  });

  it('respects a custom spacing', () => {
    const closeMarkers = [marker('a', 'click', 1_000), marker('b', 'click', 1_500)];

    expect(layoutMarkers(closeMarkers, { ...options, minSpacingPx: 100 })).toHaveLength(1);
    expect(layoutMarkers(closeMarkers, { ...options, minSpacingPx: 1 })).toHaveLength(2);
  });

  it('orders buckets by offset regardless of input order', () => {
    const buckets = layoutMarkers(
      [marker('b', 'click', 9_000), marker('a', 'click', 2_000)],
      options
    );

    expect(buckets.map(({ markers }) => markers[0].id)).toEqual(['a', 'b']);
  });

  it.each([
    ['a zero-length recording', { ...options, endTimestamp: 1_000 }],
    ['a zero width', { ...options, widthPx: 0 }],
  ])('returns no buckets for %s', (_name, layoutOptions) => {
    expect(layoutMarkers([marker('a', 'click', 1_000)], layoutOptions)).toEqual([]);
  });
});
