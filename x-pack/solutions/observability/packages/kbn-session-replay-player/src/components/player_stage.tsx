/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { computeStageFit } from '../model/stage_fit';
import type { Size } from '../model/stage_fit';
import { STAGE_ARIA_LABEL } from '../translations';
import { useElementSize } from './use_element_size';

export interface PlayerStageProps {
  /** Size of the recorded viewport; the page is shown unscaled until it is known. */
  viewport?: Size;
  /** Receives the element rrweb renders into. */
  onRootChange: (root: HTMLDivElement | null) => void;
  'data-test-subj'?: string;
}

/**
 * Scales the recorded viewport to fit the available space, centred, and never above its own size.
 * The element handed to `onRootChange` is the one rrweb renders into.
 */
export const PlayerStage = ({
  viewport,
  onRootChange,
  'data-test-subj': dataTestSubj = 'sessionReplayStage',
}: PlayerStageProps) => {
  const { euiTheme } = useEuiTheme();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const containerSize = useElementSize(container);
  const fit = viewport ? computeStageFit({ container: containerSize, viewport }) : undefined;

  const containerStyles = css`
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
  `;
  const rootStyles = css`
    position: absolute;
    top: 0;
    left: 0;
    transform-origin: 0 0;
  `;

  return (
    <div
      ref={setContainer}
      css={containerStyles}
      role="region"
      aria-label={STAGE_ARIA_LABEL}
      data-test-subj={dataTestSubj}
    >
      <div
        ref={onRootChange}
        css={rootStyles}
        style={
          viewport && fit
            ? {
                width: viewport.width,
                height: viewport.height,
                transform: `translate(${fit.offsetX}px, ${fit.offsetY}px) scale(${fit.scale})`,
              }
            : { width: '100%', height: '100%' }
        }
        data-test-subj={`${dataTestSubj}Root`}
      />
    </div>
  );
};
