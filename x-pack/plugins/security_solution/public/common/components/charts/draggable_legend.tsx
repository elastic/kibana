/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { rgba } from 'polished';
import React from 'react';
import styled from 'styled-components';

import type { LegendItem } from './draggable_legend_item';
import { DraggableLegendItem } from './draggable_legend_item';

export const MIN_LEGEND_HEIGHT = 175;
export const DEFAULT_WIDTH = 165; // px

const DraggableLegendContainer = styled.div<{ height: number; $minWidth: number }>`
  height: ${({ height }) => `${height}px`};
  overflow: auto;
  scrollbar-width: thin;
  width: 100%;
  @media only screen and (min-width: ${({ theme }) => theme.eui.euiBreakpoints.m}) {
    width: 165px;
  }
  min-width: ${({ $minWidth }) => `${$minWidth}px`};

  &::-webkit-scrollbar {
    height: ${({ theme }) => theme.eui.euiScrollBar};
    width: ${({ theme }) => theme.eui.euiScrollBar};
  }

  &::-webkit-scrollbar-thumb {
    background-clip: content-box;
    background-color: ${({ theme }) => rgba(theme.eui.euiColorDarkShade, 0.5)};
    border: ${({ theme }) => theme.eui.euiScrollBarCorner} solid transparent;
  }

  &::-webkit-scrollbar-corner,
  &::-webkit-scrollbar-track {
    background-color: transparent;
  }
`;

const DraggableLegendComponent: React.FC<{
  className?: string;
  height: number;
  legendItems: LegendItem[];
  minWidth?: number;
}> = ({ className, height, legendItems, minWidth = DEFAULT_WIDTH }) => {
  if (legendItems.length === 0) {
    return null;
  }

  return (
    <DraggableLegendContainer
      className={className}
      data-test-subj="draggable-legend"
      height={height === 0 ? MIN_LEGEND_HEIGHT : height}
      $minWidth={minWidth}
    >
      <EuiText size="xs">
        <EuiFlexGroup direction="column" gutterSize="none">
          {legendItems.map((item) => (
            <EuiFlexItem key={item.dataProviderId} grow={false}>
              <DraggableLegendItem legendItem={item} />
              <EuiSpacer data-test-subj="draggable-legend-spacer" size="s" />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiText>
    </DraggableLegendContainer>
  );
};

DraggableLegendComponent.displayName = 'DraggableLegendComponent';

export const DraggableLegend = React.memo(DraggableLegendComponent);
