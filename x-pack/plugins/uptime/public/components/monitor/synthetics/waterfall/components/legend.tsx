/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import styled from 'styled-components';
import { IWaterfallContext } from '../context/waterfall_chart';
import { WaterfallChartLegendContainer } from './styles';
import { WaterfallChartProps } from './waterfall_chart';
import { FriendlyTimingLabels, Timings } from '../../step_detail/waterfall/types';

const InlineFlexGroup = styled(EuiFlexGroup)`
  & {
    display: inline-flex;
  }
  > div {
    display: inline-flex;
  }
`;

interface LegendProps {
  items: Required<IWaterfallContext>['legendItems'];
  render: Required<WaterfallChartProps>['renderLegendItem'];
}

export const Legend: React.FC<LegendProps> = ({ items, render }) => {
  const timingLegends = items.filter((item) => item.type === 'timing');

  const mimeLegends = items.filter((item) => item.type === 'mimeType');

  return (
    <WaterfallChartLegendContainer>
      <EuiFlexGroup gutterSize="none" justifyContent="center">
        {timingLegends.map((item, index) => {
          return <EuiFlexItem key={index}>{render(item, index)}</EuiFlexItem>;
        })}
        {mimeLegends.length > 0 && (
          <EuiFlexItem grow={3}>
            <EuiText>
              <span>{FriendlyTimingLabels[Timings.Receive]}</span>
              <InlineFlexGroup gutterSize="none">
                (
                {mimeLegends.map((item, index) => (
                  <EuiFlexItem key={index}>{render(item, index)}</EuiFlexItem>
                ))}
                )
              </InlineFlexGroup>
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </WaterfallChartLegendContainer>
  );
};
