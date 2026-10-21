/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadFixtureEvents } from '../test_helpers/load_fixture';
import { installIframeSandboxProperty } from '../test_helpers/jsdom_rrweb';
import { extractThumbnailSnapshot } from './extract_thumbnail_snapshot';
import { rebuildThumbnail } from './rebuild_thumbnail';

describe('rebuildThumbnail', () => {
  let root: HTMLDivElement;

  beforeAll(() => {
    installIframeSandboxProperty();
  });

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(() => {
    root.remove();
  });

  const snapshotOf = (name: string) => {
    const snapshot = extractThumbnailSnapshot(loadFixtureEvents(name));
    if (!snapshot) {
      throw new Error(`${name} has no snapshot`);
    }
    return snapshot;
  };

  it('draws the page in a frame that cannot run scripts', async () => {
    await rebuildThumbnail({ root, snapshot: snapshotOf('thumb_checkout') });

    const frame = root.querySelector('iframe');

    expect(frame).toHaveAttribute('sandbox', 'allow-same-origin');
    expect(frame?.contentDocument?.body.textContent).toContain('Checkout');
  });

  it('sizes the frame to the recorded viewport and keeps it out of the way', async () => {
    const snapshot = snapshotOf('thumb_checkout');
    await rebuildThumbnail({ root, snapshot });

    const frame = root.querySelector('iframe');

    expect(frame?.style.width).toBe(`${snapshot.viewport.width}px`);
    expect(frame?.style.height).toBe(`${snapshot.viewport.height}px`);
    expect(frame).toHaveAttribute('aria-hidden', 'true');
    expect(frame).toHaveAttribute('tabindex', '-1');
  });

  it('removes the frame when destroyed, and can be destroyed twice', async () => {
    const { destroy } = await rebuildThumbnail({ root, snapshot: snapshotOf('thumb_checkout') });

    destroy();
    destroy();

    expect(root.querySelector('iframe')).toBeNull();
  });

  it('refuses to draw into a document that is not attached', async () => {
    await expect(
      rebuildThumbnail({
        root: document.createElement('div'),
        snapshot: snapshotOf('thumb_checkout'),
      })
    ).rejects.toThrow();
  });
});
