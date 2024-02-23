/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTab } from '@elastic/eui';
import type { FC } from 'react';
import React, { memo } from 'react';
import type { RightPanelPaths } from '.';
import type { RightPanelTabType } from './tabs';
import { FlyoutHeader } from '../../shared/components/flyout_header';
import { FlyoutHeaderTabs } from '../../shared/components/flyout_header_tabs';
import { AlertHeaderTitle } from './components/alert_header_title';
import { EventHeaderTitle } from './components/event_header_title';
import { useRightPanelContext } from './context';
import { useBasicDataFromDetailsData } from '../../../timelines/components/side_panel/event_details/helpers';

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
  tabs: RightPanelTabType[];
}

export const PanelHeader: FC<PanelHeaderProps> = memo(
  ({ selectedTabId, setSelectedTabId, tabs }) => {
    const { dataFormattedForFieldBrowser } = useRightPanelContext();
    const { isAlert } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);
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
      <FlyoutHeader>
        {isAlert ? <AlertHeaderTitle /> : <EventHeaderTitle />}
        <EuiSpacer size="m" />
        <FlyoutHeaderTabs>{renderTabs}</FlyoutHeaderTabs>
      </FlyoutHeader>
    );
  }
);

PanelHeader.displayName = 'PanelHeader';
