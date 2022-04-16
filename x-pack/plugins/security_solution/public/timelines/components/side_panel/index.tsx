/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { EuiFlyout, EuiFlyoutProps } from '@elastic/eui';

import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { EntityType } from '@kbn/timelines-plugin/common';
import { timelineActions, timelineSelectors } from '../../store/timeline';
import { timelineDefaults } from '../../store/timeline/defaults';
import { BrowserFields, DocValueFields } from '../../../common/containers/source';
import { TimelineId, TimelineTabs } from '../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { EventDetailsPanel } from './event_details';
import { HostDetailsPanel } from './host_details';
import { NetworkDetailsPanel } from './network_details';
import { UserDetailsPanel } from './user_details';

interface DetailsPanelProps {
  browserFields: BrowserFields;
  docValueFields: DocValueFields[];
  entityType?: EntityType;
  handleOnPanelClosed?: () => void;
  isFlyoutView?: boolean;
  runtimeMappings: MappingRuntimeFields;
  tabType?: TimelineTabs;
  timelineId: string;
  isReadOnly?: boolean;
}

/**
 * This panel is used in both the main timeline as well as the flyouts on the host, detection, cases, and network pages.
 * To prevent duplication the `isFlyoutView` prop is passed to determine the layout that should be used
 * `tabType` defaults to query and `handleOnPanelClosed` defaults to unsetting the default query tab which is used for the flyout panel
 */
export const DetailsPanel = React.memo(
  ({
    browserFields,
    docValueFields,
    entityType,
    handleOnPanelClosed,
    isFlyoutView,
    runtimeMappings,
    tabType,
    timelineId,
    isReadOnly,
  }: DetailsPanelProps) => {
    const dispatch = useDispatch();
    const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
    const expandedDetail = useDeepEqualSelector((state) => {
      return (getTimeline(state, timelineId) ?? timelineDefaults).expandedDetail;
    });

    // To be used primarily in the flyout scenario where we don't want to maintain the tabType
    const defaultOnPanelClose = useCallback(() => {
      dispatch(timelineActions.toggleDetailPanel({ timelineId }));
    }, [dispatch, timelineId]);

    const activeTab = tabType ?? TimelineTabs.query;
    const closePanel = useCallback(() => {
      if (handleOnPanelClosed) handleOnPanelClosed();
      else defaultOnPanelClose();
    }, [defaultOnPanelClose, handleOnPanelClosed]);

    if (!expandedDetail) return null;

    const currentTabDetail = expandedDetail[activeTab];

    if (!currentTabDetail?.panelView) return null;

    let visiblePanel = null; // store in variable to make return statement more readable
    let panelSize: EuiFlyoutProps['size'] = 's';
    const contextID = `${timelineId}-${activeTab}`;
    const isDraggable = timelineId === TimelineId.active && activeTab === TimelineTabs.query;

    if (currentTabDetail?.panelView === 'eventDetail' && currentTabDetail?.params?.eventId) {
      panelSize = 'm';
      visiblePanel = (
        <EventDetailsPanel
          browserFields={browserFields}
          docValueFields={docValueFields}
          entityType={entityType}
          expandedEvent={currentTabDetail?.params}
          handleOnEventClosed={closePanel}
          isDraggable={isDraggable}
          isFlyoutView={isFlyoutView}
          runtimeMappings={runtimeMappings}
          tabType={activeTab}
          timelineId={timelineId}
          isReadOnly={isReadOnly}
        />
      );
    }

    if (currentTabDetail?.panelView === 'hostDetail' && currentTabDetail?.params?.hostName) {
      visiblePanel = (
        <HostDetailsPanel
          contextID={contextID}
          expandedHost={currentTabDetail?.params}
          handleOnHostClosed={closePanel}
          isDraggable={isDraggable}
          isFlyoutView={isFlyoutView}
        />
      );
    }

    if (currentTabDetail?.panelView === 'userDetail' && currentTabDetail?.params?.userName) {
      visiblePanel = (
        <UserDetailsPanel
          contextID={contextID}
          userName={currentTabDetail.params.userName}
          handleOnClose={closePanel}
          isDraggable={isDraggable}
          isFlyoutView={isFlyoutView}
        />
      );
    }

    if (currentTabDetail?.panelView === 'networkDetail' && currentTabDetail?.params?.ip) {
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
      <EuiFlyout
        data-test-subj="timeline:details-panel:flyout"
        size={panelSize}
        onClose={closePanel}
        ownFocus={false}
      >
        {visiblePanel}
      </EuiFlyout>
    ) : (
      visiblePanel
    );
  }
);

DetailsPanel.displayName = 'DetailsPanel';
