/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPopover } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo, useRef, type FC } from 'react';
import type { AppStateSelectedCells, SwimlaneData } from './explorer_utils';
import { Y_AXIS_LABEL_WIDTH } from './swimlane_annotation_container';
import { CELL_HEIGHT } from './swimlane_container';

export interface SwimLaneWrapperProps {
  selection?: AppStateSelectedCells | null;
  swimlaneContainerWidth?: number;
  swimLaneData: SwimlaneData;
}

export const SwimLaneWrapper: FC<SwimLaneWrapperProps> = ({
  children,
  selection,
  swimlaneContainerWidth,
  swimLaneData,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const leftOffset = useMemo<number>(() => {
    if (!selection || !swimLaneData) return 0;
    const selectedCellIndex = swimLaneData.points.findIndex((v) => v.time === selection.times[0]);
    const cellWidth = swimlaneContainerWidth! / swimLaneData.points.length;

    const cellOffset = (selectedCellIndex + 1) * cellWidth;

    return Y_AXIS_LABEL_WIDTH + cellOffset;
  }, [selection, swimlaneContainerWidth, swimLaneData]);

  const popoverOpen = !!selection;

  const button = (
    <button
      data-test-subj="mlSwimLanePopoverTrigger"
      css={css`
        position: absolute;
        background: red;
        top: 0;
        visibility: hidden;
      `}
    >
      Test trigger
    </button>
  );

  return (
    <div
      ref={containerRef}
      data-test-subj="mlSwimLaneWrapper"
      css={css`
        position: relative;
      `}
    >
      <div
        data-test-subj="swimLanePopoverTriggerWrapper"
        style={{ left: `${leftOffset}px` }}
        css={css`
          position: absolute;
          top: -${CELL_HEIGHT / 2}px;
          height: 0;
        `}
      >
        <EuiPopover
          button={button}
          isOpen={popoverOpen}
          anchorPosition="upCenter"
          hasArrow
          repositionOnScroll
        >
          <span role={'img'}>test</span>
        </EuiPopover>
      </div>

      {children}
    </div>
  );
};
