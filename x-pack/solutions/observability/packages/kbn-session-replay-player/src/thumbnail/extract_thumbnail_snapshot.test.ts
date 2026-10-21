/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { clickEvent, fullSnapshotEvent, metaEvent, T0 } from '../test_helpers/replay_events';
import { loadFixtureEvents } from '../test_helpers/load_fixture';
import { extractThumbnailSnapshot } from './extract_thumbnail_snapshot';

describe('extractThumbnailSnapshot', () => {
  it('returns the viewport and the first full snapshot', () => {
    const first = fullSnapshotEvent(T0 + 1);
    const snapshot = extractThumbnailSnapshot([
      metaEvent(T0),
      first,
      clickEvent(T0 + 2),
      fullSnapshotEvent(T0 + 3),
    ]);

    expect(snapshot).toEqual({ viewport: { width: 800, height: 600 }, fullSnapshot: first });
  });

  it('works on the start of a real recording', () => {
    const snapshot = extractThumbnailSnapshot(loadFixtureEvents('thumb_shop_list'));

    expect(snapshot?.viewport.width).toBeGreaterThan(0);
    expect(snapshot?.fullSnapshot.type).toBe(2);
  });

  it('has nothing to draw without a snapshot', () => {
    expect(extractThumbnailSnapshot([metaEvent(T0), clickEvent(T0 + 1)])).toBeUndefined();
  });

  it('has nothing to draw without a viewport', () => {
    expect(extractThumbnailSnapshot([fullSnapshotEvent(T0), clickEvent(T0 + 1)])).toBeUndefined();
  });

  it('has nothing to draw for an empty recording', () => {
    expect(extractThumbnailSnapshot([])).toBeUndefined();
  });
});
