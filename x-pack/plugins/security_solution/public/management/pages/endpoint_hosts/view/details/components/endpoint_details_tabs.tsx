/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch } from 'react-redux';
import React, { memo, useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { EuiTabbedContent, EuiTabbedContentTab } from '@elastic/eui';
import { EndpointIndexUIQueryParams } from '../../../types';
import { EndpointAction } from '../../../store/action';
import { useEndpointSelector } from '../../hooks';
import { getActivityLogDataPaging } from '../../../store/selectors';
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

const StyledEuiTabbedContent = styled(EuiTabbedContent)`
  overflow: hidden;
  padding-bottom: ${(props) => props.theme.eui.paddingSizes.xl};

  > [role='tabpanel'] {
    height: 100%;
    padding-right: 12px;
    overflow: hidden;
    overflow-y: auto;
    ::-webkit-scrollbar {
      -webkit-appearance: none;
      width: 4px;
    }
    ::-webkit-scrollbar-thumb {
      border-radius: 2px;
      background-color: rgba(0, 0, 0, 0.5);
      -webkit-box-shadow: 0 0 1px rgba(255, 255, 255, 0.5);
    }
  }
`;

export const EndpointDetailsFlyoutTabs = memo(
  ({ show, tabs }: { show: EndpointIndexUIQueryParams['show']; tabs: EndpointDetailsTabs[] }) => {
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
          const paging = {
            page: 1,
            pageSize,
          };
          dispatch({
            type: 'appRequestedEndpointActivityLog',
            payload: paging,
          });
          dispatch({
            type: 'endpointDetailsActivityLogUpdatePaging',
            payload: {
              disabled: false,
              ...paging,
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

    return (
      <StyledEuiTabbedContent
        data-test-subj="endpointDetailsTabs"
        tabs={tabs}
        selectedTab={selectedTab}
        onTabClick={handleTabClick}
        key="endpoint-details-tabs"
      />
    );
  }
);

EndpointDetailsFlyoutTabs.displayName = 'EndpointDetailsFlyoutTabs';
