/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { IWaterfallContext } from '../context/waterfall_chart';
import { WaterfallChartLegendContainer } from './styles';
import { WaterfallChartProps } from './waterfall_chart';

interface LegendProps {
  items: Required<IWaterfallContext>['legendItems'];
  render: Required<WaterfallChartProps>['renderLegendItem'];
}

export const Legend: React.FC<LegendProps> = ({ items, render }) => {
  return (
    <WaterfallChartLegendContainer>
      <EuiFlexGroup gutterSize="none">
        {items.map((item, index) => {
          return <EuiFlexItem key={index}>{render(item, index)}</EuiFlexItem>;
        })}
      </EuiFlexGroup>
    </WaterfallChartLegendContainer>
  );
};
