/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTab, EuiTabs, useEuiBackgroundColor } from '@elastic/eui';
import type { FC } from 'react';
import React, { memo } from 'react';
import { css } from '@emotion/react';
import { FlyoutHeader } from '@kbn/security-solution-common';
import type { LeftPanelPaths } from '.';
import type { LeftPanelTabType } from './tabs';
import { getField } from '../shared/utils';
import { EventKind } from '../shared/constants/event_kinds';
import { useDocumentDetailsContext } from '../shared/context';

export interface PanelHeaderProps {
  /**
   * Id of the tab selected in the parent component to display its content
   */
  selectedTabId: LeftPanelPaths;
  /**
   * Callback to set the selected tab id in the parent component
   * @param selected
   */
  setSelectedTabId: (selected: LeftPanelPaths) => void;
  /**
   * Tabs display at the top of left panel
   */
  tabs: LeftPanelTabType[];
}

/**
 * Header at the top of the left section.
 * Displays the insights, investigation and response tabs (visualize is hidden for 8.9+).
 */
export const PanelHeader: FC<PanelHeaderProps> = memo(
  ({ selectedTabId, setSelectedTabId, tabs }) => {
    const { getFieldsData } = useDocumentDetailsContext();
    const isEventKindSignal = getField(getFieldsData('event.kind')) === EventKind.signal;

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
      <FlyoutHeader
        css={css`
          background-color: ${useEuiBackgroundColor('subdued')};
          padding-bottom: 0 !important;
          border-block-end: none !important;
        `}
      >
        <EuiTabs size="l" expand={isEventKindSignal}>
          {renderTabs}
        </EuiTabs>
      </FlyoutHeader>
    );
  }
);

PanelHeader.displayName = 'PanelHeader';
