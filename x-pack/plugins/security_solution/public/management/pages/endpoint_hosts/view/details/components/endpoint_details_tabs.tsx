/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiTab, EuiTabs, EuiFlyoutBody } from '@elastic/eui';
import { EndpointIndexUIQueryParams } from '../../../types';

import { EndpointDetailsFlyoutHeader } from './flyout_header';
import { useNavigateByRouterEventHandler } from '../../../../../../common/hooks/endpoint/use_navigate_by_router_event_handler';
import { useAppUrl } from '../../../../../../common/lib/kibana';

export enum EndpointDetailsTabsTypes {
  overview = 'details',
  activityLog = 'activity_log',
}

export type EndpointDetailsTabsId =
  | EndpointDetailsTabsTypes.overview
  | EndpointDetailsTabsTypes.activityLog;

interface EndpointDetailsTabs {
  id: string;
  name: string;
  content: JSX.Element;
  route: string;
}

const EndpointDetailsTab = memo(
  ({ tab, isSelected }: { tab: EndpointDetailsTabs; isSelected: boolean }) => {
    const { getAppUrl } = useAppUrl();
    const onClick = useNavigateByRouterEventHandler(tab.route);
    return (
      <EuiTab
        href={getAppUrl({ path: tab.route })}
        onClick={onClick}
        isSelected={isSelected}
        key={tab.id}
        data-test-subj={tab.id}
      >
        {tab.name}
      </EuiTab>
    );
  }
);

EndpointDetailsTab.displayName = 'EndpointDetailsTab';

export const EndpointDetailsFlyoutTabs = memo(
  ({
    hostname,
    show,
    tabs,
  }: {
    hostname: string;
    show: EndpointIndexUIQueryParams['show'];
    tabs: EndpointDetailsTabs[];
  }) => {
    const selectedTab = useMemo(() => tabs.find((tab) => tab.id === show), [tabs, show]);

    const renderTabs = tabs.map((tab) => (
      <EndpointDetailsTab key={tab.id} tab={tab} isSelected={tab.id === selectedTab?.id} />
    ));

    return (
      <>
        <EndpointDetailsFlyoutHeader hostname={hostname} hasBorder>
          <EuiTabs bottomBorder={false} style={{ marginBottom: '-25px' }}>
            {renderTabs}
          </EuiTabs>
        </EndpointDetailsFlyoutHeader>
        <EuiFlyoutBody data-test-subj="endpointDetailsFlyoutBody">
          {selectedTab?.content}
        </EuiFlyoutBody>
      </>
    );
  }
);

EndpointDetailsFlyoutTabs.displayName = 'EndpointDetailsFlyoutTabs';
