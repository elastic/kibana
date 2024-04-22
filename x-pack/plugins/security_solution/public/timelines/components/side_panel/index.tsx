/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type { EuiFlyoutProps } from '@elastic/eui';
import { EuiFlyout } from '@elastic/eui';

import type { EntityType } from '@kbn/timelines-plugin/common';
import { dataTableActions, dataTableSelectors } from '@kbn/securitysolution-data-table';
import styled from 'styled-components';
import { getScopedActions, isInTableScope, isTimelineScope } from '../../../helpers';
import { timelineSelectors } from '../../store';
import { timelineDefaults } from '../../store/defaults';
import type { BrowserFields } from '../../../common/containers/source';
import type { RunTimeMappings } from '../../../common/store/sourcerer/model';
import { TimelineId, TimelineTabs } from '../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { EventDetailsPanel } from './event_details';
import { HostDetailsPanel } from './host_details';
import { NetworkDetailsPanel } from './network_details';
import { UserDetailsPanel } from './user_details';

interface DetailsPanelProps {
  browserFields: BrowserFields;
  entityType?: EntityType;
  handleOnPanelClosed?: () => void;
  isFlyoutView?: boolean;
  runtimeMappings: RunTimeMappings;
  tabType?: TimelineTabs;
  scopeId: string;
  isReadOnly?: boolean;
}

// hack to to get around the fact that this flyout causes issue with timeline modal z-index
const StyleEuiFlyout = styled(EuiFlyout)`
  z-index: 1002;
`;

/**
 * This panel is used in both the main timeline as well as the flyouts on the host, detection, cases, and network pages.
 * To prevent duplication the `isFlyoutView` prop is passed to determine the layout that should be used
 * `tabType` defaults to query and `handleOnPanelClosed` defaults to unsetting the default query tab which is used for the flyout panel
 */
export const DetailsPanel = React.memo(
  ({
    browserFields,
    entityType,
    handleOnPanelClosed,
    isFlyoutView,
    runtimeMappings,
    tabType,
    scopeId,
    isReadOnly,
  }: DetailsPanelProps) => {
    const dispatch = useDispatch();
    const getScope = useMemo(() => {
      if (isTimelineScope(scopeId)) {
        return timelineSelectors.getTimelineByIdSelector();
      } else if (isInTableScope(scopeId)) {
        return dataTableSelectors.getTableByIdSelector();
      }
    }, [scopeId]);

    const expandedDetail = useDeepEqualSelector(
      (state) => ((getScope && getScope(state, scopeId)) ?? timelineDefaults)?.expandedDetail
    );

    useEffect(() => {
      /**
       * Removes the flyout from redux when it is unmounted as it's also stored in localStorage
       * This only works when navigating within the app, if navigating via the url bar,
       * the localStorage state will be maintained
       * */
      return () => {
        dispatch(
          dataTableActions.toggleDetailPanel({
            id: scopeId,
          })
        );
      };
    }, [dispatch, scopeId]);

    // To be used primarily in the flyout scenario where we don't want to maintain the tabType
    const defaultOnPanelClose = useCallback(() => {
      const scopedActions = getScopedActions(scopeId);
      if (scopedActions) {
        dispatch(scopedActions.toggleDetailPanel({ id: scopeId }));
      }
    }, [dispatch, scopeId]);

    const activeTab: TimelineTabs = tabType ?? TimelineTabs.query;
    const closePanel = useCallback(() => {
      if (handleOnPanelClosed) handleOnPanelClosed();
      else defaultOnPanelClose();
    }, [defaultOnPanelClose, handleOnPanelClosed]);

    if (!expandedDetail) return null;

    const currentTabDetail = expandedDetail[activeTab];

    if (!currentTabDetail?.panelView) return null;

    let visiblePanel = null; // store in variable to make return statement more readable
    let panelSize: EuiFlyoutProps['size'] = 's';
    let flyoutUniqueKey = scopeId;
    const contextID = `${scopeId}-${activeTab}`;
    const isDraggable = scopeId === TimelineId.active && activeTab === TimelineTabs.query;

    if (currentTabDetail?.panelView === 'eventDetail' && currentTabDetail?.params?.eventId) {
      panelSize = 'm';
      flyoutUniqueKey = currentTabDetail.params.eventId;
      visiblePanel = (
        <EventDetailsPanel
          browserFields={browserFields}
          entityType={entityType}
          expandedEvent={currentTabDetail?.params}
          handleOnEventClosed={closePanel}
          isDraggable={isDraggable}
          isFlyoutView={isFlyoutView}
          runtimeMappings={runtimeMappings}
          tabType={activeTab}
          scopeId={scopeId}
          isReadOnly={isReadOnly}
        />
      );
    }

    if (currentTabDetail?.panelView === 'hostDetail' && currentTabDetail?.params?.hostName) {
      flyoutUniqueKey = currentTabDetail.params.hostName;
      visiblePanel = (
        <HostDetailsPanel
          contextID={contextID}
          expandedHost={currentTabDetail?.params}
          handleOnHostClosed={closePanel}
          isDraggable={isDraggable}
          isFlyoutView={isFlyoutView}
          scopeId={scopeId}
        />
      );
    }

    if (currentTabDetail?.panelView === 'userDetail' && currentTabDetail?.params?.userName) {
      flyoutUniqueKey = currentTabDetail.params.userName;
      visiblePanel = (
        <UserDetailsPanel
          contextID={contextID}
          userName={currentTabDetail.params.userName}
          handleOnClose={closePanel}
          isDraggable={isDraggable}
          isFlyoutView={isFlyoutView}
          scopeId={scopeId}
        />
      );
    }

    if (currentTabDetail?.panelView === 'networkDetail' && currentTabDetail?.params?.ip) {
      flyoutUniqueKey = currentTabDetail.params.ip;
      visiblePanel = (
        <NetworkDetailsPanel
          contextID={contextID}
          expandedNetwork={currentTabDetail?.params}
          handleOnNetworkClosed={closePanel}
          isDraggable={isDraggable}
          isFlyoutView={isFlyoutView}
        />
      );
    }

    return isFlyoutView ? (
      <StyleEuiFlyout
        data-test-subj="timeline:details-panel:flyout"
        size={panelSize}
        onClose={closePanel}
        ownFocus={false}
        key={flyoutUniqueKey}
      >
        {visiblePanel}
      </StyleEuiFlyout>
    ) : (
      visiblePanel
    );
  }
);

DetailsPanel.displayName = 'DetailsPanel';
