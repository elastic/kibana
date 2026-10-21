/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEventUrlNeutralizer } from '../model/url_policy';
import { CANVAS_PLACEHOLDER_RULE } from '../rrweb/canvas_placeholder';
import type { ReplayThumbnailSnapshot } from '../types';

export interface RebuiltThumbnail {
  /** Removes the frame; safe to call more than once. */
  destroy: () => void;
}

let pending: Promise<typeof import('rrweb-snapshot')> | undefined;

/** Loads rrweb-snapshot the first time a thumbnail needs it; every caller shares one load. */
const loadRrwebSnapshot = (): Promise<typeof import('rrweb-snapshot')> => {
  if (!pending) {
    pending = import('rrweb-snapshot').catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
  }
  return pending;
};

/**
 * Draws the first frame of a recording into a frame inside `root`, once. The frame is sandboxed
 * the way rrweb requires (no scripts), the snapshot goes through the URL policy before it is
 * built, and nothing runs afterwards: it is a still picture.
 */
export const rebuildThumbnail = async ({
  root,
  snapshot,
  allowedRemoteOrigins,
}: {
  root: HTMLElement;
  snapshot: ReplayThumbnailSnapshot;
  allowedRemoteOrigins?: readonly string[];
}): Promise<RebuiltThumbnail> => {
  const { createCache, createMirror, rebuildIntoSandboxedIframe } = await loadRrwebSnapshot();
  const safe = createEventUrlNeutralizer({ allowedOrigins: allowedRemoteOrigins })(
    snapshot.fullSnapshot
  );
  if (safe.type !== 2) {
    throw new Error('A thumbnail needs a full snapshot');
  }

  const { iframe } = rebuildIntoSandboxedIframe(safe.data.node, {
    root,
    mirror: createMirror(),
    cache: createCache(),
    hackCss: true,
    iframeAttributes: { tabindex: '-1', 'aria-hidden': 'true' },
  });
  iframe.style.border = '0';
  iframe.style.width = `${snapshot.viewport.width}px`;
  iframe.style.height = `${snapshot.viewport.height}px`;
  iframe.style.pointerEvents = 'none';

  const placeholder = iframe.ownerDocument.createElement('style');
  placeholder.textContent = CANVAS_PLACEHOLDER_RULE;
  iframe.contentDocument?.head.appendChild(placeholder);

  return { destroy: () => iframe.remove() };
};
