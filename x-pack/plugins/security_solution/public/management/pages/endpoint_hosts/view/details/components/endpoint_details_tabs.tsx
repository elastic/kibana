/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { EuiTabbedContent, EuiTabbedContentTab } from '@elastic/eui';

export enum EndpointDetailsTabsTypes {
  overview = 'overview',
  activityLog = 'activity-log',
}

export type EndpointDetailsTabsId =
  | EndpointDetailsTabsTypes.overview
  | EndpointDetailsTabsTypes.activityLog;

interface EndpointDetailsTabs {
  id: string;
  name: string;
  content: JSX.Element;
}

const StyledEuiTabbedContent = styled(EuiTabbedContent)`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;

  > [role='tabpanel'] {
    padding: 12px 0;
    display: flex;
    flex: 1;
    flex-direction: column;
    overflow: hidden;
    overflow-y: auto;
    ::-webkit-scrollbar {
      -webkit-appearance: none;
      width: 7px;
    }
    ::-webkit-scrollbar-thumb {
      border-radius: 4px;
      background-color: rgba(0, 0, 0, 0.5);
      -webkit-box-shadow: 0 0 1px rgba(255, 255, 255, 0.5);
    }
  }
`;

export const EndpointDetailsFlyoutTabs = ({ tabs }: { tabs: EndpointDetailsTabs[] }) => {
  const [selectedTabId, setSelectedTabId] = useState<EndpointDetailsTabsId>(
    EndpointDetailsTabsTypes.overview
  );

  const handleTabClick = useCallback(
    (tab: EuiTabbedContentTab) => setSelectedTabId(tab.id as EndpointDetailsTabsId),
    [setSelectedTabId]
  );

  const selectedTab = useMemo(() => tabs.find((tab) => tab.id === selectedTabId), [
    tabs,
    selectedTabId,
  ]);

  return (
    <StyledEuiTabbedContent
      data-test-subj="endpointDetailsTabs"
      tabs={tabs}
      selectedTab={selectedTab}
      onTabClick={handleTabClick}
      key="endpoint-details-tabs"
    />
  );
};

EndpointDetailsFlyoutTabs.displayName = 'EndpointDetailsFlyoutTabs';
