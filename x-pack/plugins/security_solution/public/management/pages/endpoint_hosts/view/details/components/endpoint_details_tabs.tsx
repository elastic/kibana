/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch } from 'react-redux';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiTab, EuiTabs, EuiFlyoutBody, EuiTabbedContentTab, EuiSpacer } from '@elastic/eui';
import { EndpointIndexUIQueryParams } from '../../../types';
import { EndpointAction } from '../../../store/action';
import { useEndpointSelector } from '../../hooks';
import { getActivityLogDataPaging } from '../../../store/selectors';
import { EndpointDetailsFlyoutHeader } from './flyout_header';

export enum EndpointDetailsTabsTypes {
  overview = 'overview',
  activityLog = 'activity_log',
}

export type EndpointDetailsTabsId =
  | EndpointDetailsTabsTypes.overview
  | EndpointDetailsTabsTypes.activityLog;

interface EndpointDetailsTabs {
  id: string;
  name: string;
  content: JSX.Element;
}

export const EndpointDetailsFlyoutTabs = memo(
  ({
    hostname,
    show,
    tabs,
  }: {
    hostname?: string;
    show: EndpointIndexUIQueryParams['show'];
    tabs: EndpointDetailsTabs[];
  }) => {
    const dispatch = useDispatch<(action: EndpointAction) => void>();
    const { pageSize } = useEndpointSelector(getActivityLogDataPaging);
    const [selectedTabId, setSelectedTabId] = useState<EndpointDetailsTabsId>(() => {
      return show === 'details'
        ? EndpointDetailsTabsTypes.overview
        : EndpointDetailsTabsTypes.activityLog;
    });

    const handleTabClick = useCallback(
      (tab: EuiTabbedContentTab) => {
        dispatch({
          type: 'endpointDetailsFlyoutTabChanged',
          payload: {
            flyoutView: tab.id as EndpointIndexUIQueryParams['show'],
          },
        });
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
        return setSelectedTabId(tab.id as EndpointDetailsTabsId);
      },
      [dispatch, pageSize, setSelectedTabId]
    );

    const selectedTab = useMemo(() => tabs.find((tab) => tab.id === selectedTabId), [
      tabs,
      selectedTabId,
    ]);

    const renderTabs = tabs.map((tab) => (
      <EuiTab
        onClick={() => handleTabClick(tab)}
        isSelected={tab.id === selectedTabId}
        key={tab.id}
        data-test-subj={tab.id}
      >
        {tab.name}
      </EuiTab>
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
