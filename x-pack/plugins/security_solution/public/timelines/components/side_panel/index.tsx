/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, ReactNode } from 'react';
import { useDispatch } from 'react-redux';
import { EuiFlyout, EuiFlyoutProps } from '@elastic/eui';
import styled, { StyledComponent } from 'styled-components';
import { timelineActions, timelineSelectors } from '../../store/timeline';
import { timelineDefaults } from '../../store/timeline/defaults';
import { BrowserFields, DocValueFields } from '../../../common/containers/source';
import { TimelineTabs } from '../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { EventDetailsPanel } from './event_details';
import { HostDetailsPanel } from './host_details';
import { NetworkDetailsPanel } from './network_details';

const StyledEuiFlyout: StyledComponent<typeof EuiFlyout, {}, { children?: ReactNode }> = styled(
  EuiFlyout
)`
  z-index: ${({ theme }) => theme.eui.euiZLevel7};
`;

interface DetailsPanelProps {
  browserFields: BrowserFields;
  docValueFields: DocValueFields[];
  handleOnPanelClosed?: () => void;
  isFlyoutView?: boolean;
  tabType?: TimelineTabs;
  timelineId: string;
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
    handleOnPanelClosed,
    isFlyoutView,
    tabType,
    timelineId,
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
    if (currentTabDetail?.panelView === 'eventDetail' && currentTabDetail?.params?.eventId) {
      panelSize = 'm';
      visiblePanel = (
        <EventDetailsPanel
          browserFields={browserFields}
          docValueFields={docValueFields}
          expandedEvent={currentTabDetail?.params}
          handleOnEventClosed={closePanel}
          isFlyoutView={isFlyoutView}
          tabType={activeTab}
          timelineId={timelineId}
        />
      );
    }

    if (currentTabDetail?.panelView === 'hostDetail' && currentTabDetail?.params?.hostName) {
      visiblePanel = (
        <HostDetailsPanel
          contextID={contextID}
          expandedHost={currentTabDetail?.params}
          handleOnHostClosed={closePanel}
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
          isFlyoutView={isFlyoutView}
        />
      );
    }

    return isFlyoutView ? (
      <StyledEuiFlyout
        data-test-subj="timeline:details-panel:flyout"
        size={panelSize}
        onClose={closePanel}
      >
        {visiblePanel}
      </StyledEuiFlyout>
    ) : (
      visiblePanel
    );
  }
);

DetailsPanel.displayName = 'DetailsPanel';
