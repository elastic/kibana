/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { rgba } from 'polished';
import React from 'react';
import styled from 'styled-components';

import { DraggableLegendItem, LegendItem } from './draggable_legend_item';

export const MIN_LEGEND_HEIGHT = 175;

const DraggableLegendContainer = styled.div<{ height: number }>`
  height: ${({ height }) => `${height}px`};
  overflow: auto;
  scrollbar-width: thin;
  width: 165px;

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
  height: number;
  legendItems: LegendItem[];
}> = ({ height, legendItems }) => {
  if (legendItems.length === 0) {
    return null;
  }

  return (
    <DraggableLegendContainer
      data-test-subj="draggable-legend"
      height={height === 0 ? MIN_LEGEND_HEIGHT : height}
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
