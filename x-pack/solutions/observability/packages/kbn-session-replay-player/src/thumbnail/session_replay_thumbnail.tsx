/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { computeStageFit } from '../model/stage_fit';
import { THUMBNAIL_ARIA_LABEL } from '../translations';
import type { SessionReplayThumbnailProps } from '../types';
import { rebuildThumbnail } from './rebuild_thumbnail';
import { useHasBeenVisible } from './use_is_visible';

const DEFAULT_WIDTH = 160;
const DEFAULT_HEIGHT = 100;

/**
 * A still picture of the first frame of a recording. The page is drawn once, when the thumbnail
 * first scrolls into view, and never updates; until then, and when there is nothing to draw or
 * drawing fails, a hatched placeholder shows.
 */
export const SessionReplayThumbnail = ({
  snapshot,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  allowedRemoteOrigins,
  'aria-label': ariaLabel = THUMBNAIL_ARIA_LABEL,
  'data-test-subj': dataTestSubj = 'sessionReplayThumbnail',
}: SessionReplayThumbnailProps) => {
  const { euiTheme } = useEuiTheme();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const [drawn, setDrawn] = useState(false);
  const visible = useHasBeenVisible(container);

  useEffect(() => {
    if (!visible || !stage || !snapshot) {
      return undefined;
    }
    let cancelled = false;
    let destroy: (() => void) | undefined;
    rebuildThumbnail({ root: stage, snapshot, allowedRemoteOrigins })
      .then((rebuilt) => {
        if (cancelled) {
          rebuilt.destroy();
          return;
        }
        destroy = rebuilt.destroy;
        setDrawn(true);
      })
      .catch(() => {
        // The placeholder stays when the page cannot be drawn.
      });
    return () => {
      cancelled = true;
      destroy?.();
      setDrawn(false);
    };
    // The snapshot is drawn once per snapshot; a new origin list does not redraw it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, stage, snapshot]);

  const fit = snapshot
    ? computeStageFit({ container: { width, height }, viewport: snapshot.viewport })
    : undefined;

  const containerStyles = css`
    position: relative;
    overflow: hidden;
    flex: none;
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.small};
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
  `;
  const placeholderStyles = css`
    position: absolute;
    inset: 0;
    background-image: repeating-linear-gradient(
      45deg,
      ${euiTheme.colors.lightShade} 0,
      ${euiTheme.colors.lightShade} 6px,
      transparent 6px,
      transparent 12px
    );
  `;
  const stageStyles = css`
    position: absolute;
    top: 0;
    left: 0;
    transform-origin: 0 0;
  `;

  return (
    <div
      ref={setContainer}
      css={containerStyles}
      style={{ width, height }}
      role="img"
      aria-label={ariaLabel}
      data-test-subj={dataTestSubj}
      data-state={drawn ? 'drawn' : 'placeholder'}
    >
      {!drawn && <div css={placeholderStyles} data-test-subj={`${dataTestSubj}Placeholder`} />}
      <div
        ref={setStage}
        css={stageStyles}
        aria-hidden="true"
        style={
          snapshot && fit
            ? {
                width: snapshot.viewport.width,
                height: snapshot.viewport.height,
                transform: `translate(${fit.offsetX}px, ${fit.offsetY}px) scale(${fit.scale})`,
              }
            : undefined
        }
      />
    </div>
  );
};
