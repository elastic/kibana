/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { HostIsolationPanel } from '../../../../detections/components/host_isolation';
import { ExpandableEvent } from '../event_details/expandable_event';
import { ACTIVE_PANEL } from '../event_details';
import { getFieldValue } from '../../../../detections/components/host_isolation/helpers';
import { useKibana } from '../../../../common/lib/kibana';
import { BrowserFields, TimelineEventsDetailsItem } from '../../../../../../timelines/common';
import { HostRisk } from '../../../../risk_score/containers';

const OsqueryActionWrapper = styled.div`
  padding: 8px;
`;

export interface IProps {
  browserFields: BrowserFields;
  detailsData: TimelineEventsDetailsItem[] | null;
  expandedEvent: {
    eventId: string;
    indexName: string;
    refetch?: () => void;
  };
  handleIsolationActionSuccess: () => void;
  handleOnEventClosed: () => void;
  hostRisk: HostRisk | null;
  activePanel: ACTIVE_PANEL | null;
  isAlert: boolean;
  isDraggable?: boolean;
  isolateAction: string;
  loading: boolean;
  rawEventData: object | undefined;
  showAlertDetails: () => void;
  timelineId: string;
}

const EventDetailsFlyoutBodyComponent: React.FC<IProps> = ({
  browserFields,
  detailsData,
  expandedEvent,
  handleIsolationActionSuccess,
  handleOnEventClosed,
  hostRisk,
  activePanel,
  isAlert,
  isDraggable,
  isolateAction,
  loading,
  rawEventData,
  showAlertDetails,
  timelineId,
}) => {
  const {
    services: { osquery },
  } = useKibana();

  const agentId = useMemo(
    () => getFieldValue({ category: 'agent', field: 'agent.id' }, detailsData),
    [detailsData]
  );

  switch (activePanel) {
    case ACTIVE_PANEL.OSQUERY:
      return (
        <OsqueryActionWrapper data-test-subj={'flyout-body-osquery'}>
          {osquery?.OsqueryAction?.({ agentId, formType: 'steps' })}
        </OsqueryActionWrapper>
      );
    case ACTIVE_PANEL.HOST_ISOLATION:
      return (
        <HostIsolationPanel
          data-test-subj={'flyout-body-host-isolation'}
          details={detailsData}
          cancelCallback={showAlertDetails}
          successCallback={handleIsolationActionSuccess}
          isolateAction={isolateAction}
        />
      );
    default:
      return (
        <ExpandableEvent
          data-test-subj={'flyout-body-default'}
          browserFields={browserFields}
          detailsData={detailsData}
          event={expandedEvent}
          isAlert={isAlert}
          isDraggable={isDraggable}
          loading={loading}
          rawEventData={rawEventData}
          timelineId={timelineId}
          timelineTabType="flyout"
          hostRisk={hostRisk}
          handleOnEventClosed={handleOnEventClosed}
        />
      );
  }
};

export const EventDetailsFlyoutBody = React.memo(EventDetailsFlyoutBodyComponent);
