/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { IWaterfallContext } from '../context/waterfall_chart';
import { WaterfallChartProps } from './waterfall_chart';

interface LegendProps {
  items: Required<IWaterfallContext>['legendItems'];
  render: Required<WaterfallChartProps>['renderLegendItem'];
}

const StyledFlexItem = euiStyled(EuiFlexItem)`
  margin-right: ${(props) => props.theme.eui.euiSizeM};
  max-width: 7%;
  min-width: 160px;
`;

export const Legend: React.FC<LegendProps> = ({ items, render }) => {
  return (
    <EuiFlexGroup gutterSize="s" wrap>
      {items.map((item, index) => (
        <StyledFlexItem key={index}>{render(item, index)}</StyledFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
