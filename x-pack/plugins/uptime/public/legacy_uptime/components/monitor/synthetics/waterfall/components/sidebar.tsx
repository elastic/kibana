/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FIXED_AXIS_HEIGHT, SIDEBAR_GROW_SIZE } from './constants';
import { IWaterfallContext, useWaterfallContext } from '../context/waterfall_chart';
import {
  WaterfallChartSidebarContainer,
  WaterfallChartSidebarContainerInnerPanel,
  WaterfallChartSidebarContainerFlexGroup,
  WaterfallChartSidebarFlexItem,
  WaterfallChartSidebarWrapper,
} from './styles';
import { WaterfallChartProps } from './waterfall_chart';

interface SidebarProps {
  items: Required<IWaterfallContext>['sidebarItems'];
  render: Required<WaterfallChartProps>['renderSidebarItem'];
}

export const Sidebar: React.FC<SidebarProps> = ({ items, render }) => {
  const { onSidebarClick } = useWaterfallContext();
  const handleSidebarClick = useMemo(() => onSidebarClick, [onSidebarClick]);

  return (
    <WaterfallChartSidebarWrapper grow={SIDEBAR_GROW_SIZE}>
      <WaterfallChartSidebarContainer
        height={items.length * FIXED_AXIS_HEIGHT}
        data-test-subj="wfSidebarContainer"
      >
        <WaterfallChartSidebarContainerInnerPanel
          paddingSize="none"
          hasBorder={false}
          hasShadow={false}
        >
          <WaterfallChartSidebarContainerFlexGroup
            direction="column"
            gutterSize="none"
            responsive={false}
          >
            {items.map((item, index) => {
              return (
                <WaterfallChartSidebarFlexItem key={index}>
                  {render(item, index, handleSidebarClick)}
                </WaterfallChartSidebarFlexItem>
              );
            })}
          </WaterfallChartSidebarContainerFlexGroup>
        </WaterfallChartSidebarContainerInnerPanel>
      </WaterfallChartSidebarContainer>
    </WaterfallChartSidebarWrapper>
  );
};
