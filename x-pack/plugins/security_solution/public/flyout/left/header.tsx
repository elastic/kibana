/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyoutHeader, EuiTab, EuiTabs } from '@elastic/eui';
import type { VFC } from 'react';
import React, { memo } from 'react';
import { css } from '@emotion/react';
import type { LeftPanelPaths } from '.';
import { tabs } from './tabs';

export interface PanelHeaderProps {
  selectedTabId: LeftPanelPaths;
  setSelectedTabId: (selected: LeftPanelPaths) => void;
  handleOnEventClosed?: () => void;
}

export const PanelHeader: VFC<PanelHeaderProps> = memo(
  ({ selectedTabId, setSelectedTabId, handleOnEventClosed }) => {
    const onSelectedTabChanged = (id: LeftPanelPaths) => setSelectedTabId(id);
    const renderTabs = tabs.map((tab, index) => (
      <EuiTab
        onClick={() => onSelectedTabChanged(tab.id)}
        isSelected={tab.id === selectedTabId}
        key={index}
        data-test-subj={tab['data-test-subj']}
      >
        {tab.name}
      </EuiTab>
    ));

    return (
      <EuiFlyoutHeader hasBorder>
        <EuiTabs
          size="l"
          expand
          css={css`
            margin-bottom: -25px;
          `}
        >
          {renderTabs}
        </EuiTabs>
      </EuiFlyoutHeader>
    );
  }
);

PanelHeader.displayName = 'PanelHeader';
