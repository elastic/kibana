/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { DataProvider } from '../../timeline/data_providers/data_provider';
import { flattenIntoAndGroups } from '../../timeline/data_providers/helpers';
import { DataProviders } from '../../timeline/data_providers';
import { FLYOUT_BUTTON_BAR_CLASS_NAME } from '../../timeline/helpers';
import { FlyoutHeaderPanel } from '../header';
import { TimelineTabs } from '../../../../../common/types/timeline';

export const getBadgeCount = (dataProviders: DataProvider[]): number =>
  flattenIntoAndGroups(dataProviders).reduce((total, group) => total + group.length, 0);

const DataProvidersPanel = styled(EuiPanel)`
  border-radius: 0;
  padding: 0 4px 0 4px;
  user-select: none;
  z-index: ${({ theme }) => theme.eui.euiZLevel9};
`;

interface FlyoutBottomBarProps {
  activeTab: TimelineTabs;
  showDataproviders: boolean;
  timelineId: string;
}

export const FlyoutBottomBar = React.memo<FlyoutBottomBarProps>(
  ({ activeTab, showDataproviders, timelineId }) => {
    return (
      <div className={FLYOUT_BUTTON_BAR_CLASS_NAME} data-test-subj="flyoutBottomBar">
        {showDataproviders && <FlyoutHeaderPanel timelineId={timelineId} />}
        {(showDataproviders || (!showDataproviders && activeTab !== TimelineTabs.query)) && (
          <DataProvidersPanel paddingSize="none">
            <DataProviders timelineId={timelineId} data-test-subj="dataProviders-bottomBar" />
          </DataProvidersPanel>
        )}
      </div>
    );
  }
);

FlyoutBottomBar.displayName = 'FlyoutBottomBar';
