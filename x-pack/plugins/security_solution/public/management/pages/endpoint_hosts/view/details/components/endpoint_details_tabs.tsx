/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiTab, EuiTabs, EuiFlyoutBody, EuiToolTip } from '@elastic/eui';
import { EndpointIndexUIQueryParams } from '../../../types';

import { EndpointDetailsFlyoutHeader } from './flyout_header';
import { useNavigateByRouterEventHandler } from '../../../../../../common/hooks/endpoint/use_navigate_by_router_event_handler';
import { useAppUrl } from '../../../../../../common/lib/kibana';
import { useIsolationPrivileges } from '../../../../../../common/hooks/endpoint/use_isolate_privileges';

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
  ({
    tab,
    isSelected,
    isDisabled,
  }: {
    tab: EndpointDetailsTabs;
    isSelected: boolean;
    isDisabled: boolean;
  }) => {
    const { getAppUrl } = useAppUrl();
    const onClick = useNavigateByRouterEventHandler(tab.route);
    const TabComponent = (
      <EuiTab
        disabled={isDisabled}
        href={getAppUrl({ path: tab.route })}
        onClick={onClick}
        isSelected={isSelected}
        key={tab.id}
        data-test-subj={tab.id}
      >
        {tab.name}
      </EuiTab>
    );
    return isDisabled ? (
      <EuiToolTip
        position="right"
        title="Access denied!"
        content="Your assigned role does not allow access to Endpoint Activity Log"
      >
        {TabComponent}
      </EuiToolTip>
    ) : (
      TabComponent
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
    const { isViewActivityLogAllowed } = useIsolationPrivileges();
    const selectedTab = useMemo(() => tabs.find((tab) => tab.id === show), [tabs, show]);
    const renderTabs = tabs.map((tab) => (
      <EndpointDetailsTab
        key={tab.id}
        isDisabled={!isViewActivityLogAllowed && tab.id === 'activity_log'}
        isSelected={tab.id === selectedTab?.id}
        tab={tab}
      />
    ));

    return (
      <>
        <EndpointDetailsFlyoutHeader hostname={hostname} hasBorder>
          <EuiTabs style={{ marginBottom: '-25px' }}>{renderTabs}</EuiTabs>
        </EndpointDetailsFlyoutHeader>
        <EuiFlyoutBody data-test-subj="endpointDetailsFlyoutBody">
          {selectedTab?.content}
        </EuiFlyoutBody>
      </>
    );
  }
);

EndpointDetailsFlyoutTabs.displayName = 'EndpointDetailsFlyoutTabs';
