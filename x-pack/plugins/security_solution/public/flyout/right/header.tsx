/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyoutHeader, EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import type { VFC } from 'react';
import React, { memo } from 'react';
import { css } from '@emotion/react';
import type { RightPanelPaths } from '.';
import type { RightPanelTabsType } from './tabs';
import { HeaderTitle } from './components/header_title';
import { ExpandDetailButton } from './components/expand_detail_button';

export interface PanelHeaderProps {
  /**
   * Id of the tab selected in the parent component to display its content
   */
  selectedTabId: RightPanelPaths;
  /**
   * Callback to set the selected tab id in the parent component
   * @param selected
   */
  setSelectedTabId: (selected: RightPanelPaths) => void;
  /**
   * Tabs to display in the header
   */
  tabs: RightPanelTabsType;
  /**
   * If true, the expand detail button will be displayed
   */
  flyoutIsExpandable: boolean;
}

export const PanelHeader: VFC<PanelHeaderProps> = memo(
  ({ flyoutIsExpandable, selectedTabId, setSelectedTabId, tabs }) => {
    const onSelectedTabChanged = (id: RightPanelPaths) => setSelectedTabId(id);
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
      <EuiFlyoutHeader
        hasBorder
        css={css`
          margin-bottom: ${flyoutIsExpandable ? '-24px' : '0px'};
        `}
      >
        {flyoutIsExpandable && (
          <div
            // moving the buttons up in the header
            css={css`
              margin-top: -24px;
              margin-left: -8px;
            `}
          >
            <ExpandDetailButton />
          </div>
        )}
        <EuiSpacer size="xs" />
        <HeaderTitle flyoutIsExpandable={flyoutIsExpandable} />
        <EuiSpacer size="m" />
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
