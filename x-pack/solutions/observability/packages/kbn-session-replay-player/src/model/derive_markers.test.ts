/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { clickEvent, fullSnapshotEvent, metaEvent, T0 } from '../test_helpers/replay_events';
import { deriveReplayMarkers } from './derive_markers';

describe('deriveReplayMarkers', () => {
  it('derives a navigation per changed page address and a click per recorded click', () => {
    const markers = deriveReplayMarkers([
      metaEvent(T0, 'https://shop.example/products?page=2'),
      fullSnapshotEvent(T0 + 1),
      clickEvent(T0 + 500),
      metaEvent(T0 + 2_000, 'https://shop.example/checkout'),
    ]);

    expect(markers.map(({ kind, timestamp, label }) => [kind, timestamp, label])).toEqual([
      ['navigation', T0, '/products?page=2'],
      ['click', T0 + 500, 'Click'],
      ['navigation', T0 + 2_000, '/checkout'],
    ]);
  });

  it('collapses consecutive viewport events for the same address', () => {
    const markers = deriveReplayMarkers([
      metaEvent(T0, 'https://shop.example/'),
      metaEvent(T0 + 300_000, 'https://shop.example/'),
    ]);

    expect(markers).toHaveLength(1);
  });

  it('keeps a navigation when the address changes back to an earlier one', () => {
    const markers = deriveReplayMarkers([
      metaEvent(T0, 'https://shop.example/a'),
      metaEvent(T0 + 1, 'https://shop.example/b'),
      metaEvent(T0 + 2, 'https://shop.example/a'),
    ]);

    expect(markers.map(({ label }) => label)).toEqual(['/a', '/b', '/a']);
  });

  it('truncates the label of an address that is not a URL', () => {
    const [marker] = deriveReplayMarkers([metaEvent(T0, 'x'.repeat(200))]);

    expect(marker.label).toHaveLength(64);
    expect(marker.label.endsWith('…')).toBe(true);
  });

  it('gives every marker a unique id', () => {
    const markers = deriveReplayMarkers([clickEvent(T0), clickEvent(T0)]);

    expect(new Set(markers.map(({ id }) => id)).size).toBe(2);
  });

  it('returns nothing for an empty recording', () => {
    expect(deriveReplayMarkers([])).toEqual([]);
  });
});
