/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { FIXED_AXIS_HEIGHT, SIDEBAR_GROW_SIZE } from './constants';
import { IWaterfallContext, useWaterfallContext } from './context/waterfall_context';
import { WaterfallChartSidebarWrapper } from './styles';
import { WaterfallChartProps } from './waterfall_chart';

interface SidebarProps {
  items: Required<IWaterfallContext>['sidebarItems'];
  render: Required<WaterfallChartProps>['renderSidebarItem'];
}

export const Sidebar: React.FC<SidebarProps> = ({ items, render }) => {
  const { euiTheme } = useEuiTheme();
  const { onSidebarClick } = useWaterfallContext();
  const handleSidebarClick = useMemo(() => onSidebarClick, [onSidebarClick]);

  return (
    <WaterfallChartSidebarWrapper grow={SIDEBAR_GROW_SIZE}>
      <div
        style={{ height: items.length * FIXED_AXIS_HEIGHT, overflow: 'hidden' }}
        data-test-subj="wfSidebarContainer"
      >
        <EuiPanel css={{ height: '100%' }} hasBorder={false} hasShadow={false} paddingSize="none">
          <EuiFlexGroup
            css={{ height: '100%' }}
            direction="column"
            gutterSize="none"
            responsive={false}
          >
            {items.map((item, index) => {
              return (
                <EuiFlexItem
                  key={index}
                  css={{
                    outline: 0,
                    minWidth: 0, // Needed for flex to not stretch noWrap children
                    justifyContent: 'space-around',
                    paddingRight: euiTheme.size.s,
                  }}
                >
                  {render(item, index, handleSidebarClick)}
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
        </EuiPanel>
      </div>
    </WaterfallChartSidebarWrapper>
  );
};
