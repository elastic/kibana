/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexItem } from '@elastic/eui';
import { FIXED_AXIS_HEIGHT, SIDEBAR_GROW_SIZE } from './constants';
import { IWaterfallContext } from '../context/waterfall_chart';
import {
  WaterfallChartSidebarContainer,
  WaterfallChartSidebarContainerInnerPanel,
  WaterfallChartSidebarContainerFlexGroup,
  WaterfallChartSidebarFlexItem,
} from './styles';
import { WaterfallChartProps } from './waterfall_chart';

interface SidebarProps {
  items: Required<IWaterfallContext>['sidebarItems'];
  render: Required<WaterfallChartProps>['renderSidebarItem'];
}

export const Sidebar: React.FC<SidebarProps> = ({ items, render }) => {
  return (
    <EuiFlexItem grow={SIDEBAR_GROW_SIZE}>
      <WaterfallChartSidebarContainer height={items.length * FIXED_AXIS_HEIGHT}>
        <WaterfallChartSidebarContainerInnerPanel paddingSize="none">
          <WaterfallChartSidebarContainerFlexGroup
            direction="column"
            gutterSize="none"
            responsive={false}
          >
            {items.map((item, index) => {
              return (
                <WaterfallChartSidebarFlexItem key={index}>
                  {render(item, index)}
                </WaterfallChartSidebarFlexItem>
              );
            })}
          </WaterfallChartSidebarContainerFlexGroup>
        </WaterfallChartSidebarContainerInnerPanel>
      </WaterfallChartSidebarContainer>
    </EuiFlexItem>
  );
};
