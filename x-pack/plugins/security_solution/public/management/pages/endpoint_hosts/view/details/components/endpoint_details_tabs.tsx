/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch } from 'react-redux';
import React, { memo, useCallback, useMemo } from 'react';
import { EuiTab, EuiTabs, EuiFlyoutBody, EuiTabbedContentTab, EuiSpacer } from '@elastic/eui';
import { EndpointIndexUIQueryParams } from '../../../types';
import { EndpointAction } from '../../../store/action';
import { useEndpointSelector } from '../../hooks';
import { getActivityLogDataPaging } from '../../../store/selectors';
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
  ({
    tab,
    isSelected,
    handleTabClick,
  }: {
    tab: EndpointDetailsTabs;
    isSelected: boolean;
    handleTabClick: () => void;
  }) => {
    const { getAppUrl } = useAppUrl();
    const onClick = useNavigateByRouterEventHandler(tab.route, handleTabClick);
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
    const dispatch = useDispatch<(action: EndpointAction) => void>();
    const { pageSize } = useEndpointSelector(getActivityLogDataPaging);

    const handleTabClick = useCallback(
      (tab: EuiTabbedContentTab) => {
        if (tab.id === EndpointDetailsTabsTypes.activityLog) {
          dispatch({
            type: 'endpointDetailsActivityLogUpdatePaging',
            payload: {
              disabled: false,
              page: 1,
              pageSize,
              startDate: undefined,
              endDate: undefined,
            },
          });
        }
      },
      [dispatch, pageSize]
    );

    const selectedTab = useMemo(() => tabs.find((tab) => tab.id === show), [tabs, show]);

    const renderTabs = tabs.map((tab) => (
      <EndpointDetailsTab
        tab={tab}
        handleTabClick={() => handleTabClick(tab)}
        isSelected={tab.id === selectedTab?.id}
      />
    ));

    return (
      <>
        <EndpointDetailsFlyoutHeader hostname={hostname} hasBorder>
          <EuiSpacer size="s" />
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
