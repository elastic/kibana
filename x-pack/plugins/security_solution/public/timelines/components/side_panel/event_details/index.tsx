/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { some } from 'lodash/fp';
import {
  EuiButtonEmpty,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiSpacer,
  EuiTitle,
  EuiText,
} from '@elastic/eui';
import React, { useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import deepEqual from 'fast-deep-equal';
import { BrowserFields, DocValueFields } from '../../../../common/containers/source';
import { ExpandableEvent, ExpandableEventTitle } from './expandable_event';
import { useTimelineEventsDetails } from '../../../containers/details';
import { TimelineTabs } from '../../../../../common/types/timeline';
import { HostIsolationPanel } from '../../../../detections/components/host_isolation';
import { EndpointIsolateSuccess } from '../../../../common/components/endpoint/host_isolation';
import {
  ISOLATE_HOST,
  UNISOLATE_HOST,
} from '../../../../detections/components/host_isolation/translations';
import { getFieldValue } from '../../../../detections/components/host_isolation/helpers';
import { ALERT_DETAILS } from './translations';
import { useWithCaseDetailsRefresh } from '../../../../common/components/endpoint/host_isolation/endpoint_host_isolation_cases_context';
import { TimelineNonEcsData } from '../../../../../common';
import { Ecs } from '../../../../../common/ecs';
import { EventDetailsFooter } from './footer';
import { EntityType } from '../../../../../../timelines/common';
import { useHostsRiskScore } from '../../../../overview/containers/overview_risky_host_links/use_hosts_risk_score';

const StyledEuiFlyoutBody = styled(EuiFlyoutBody)`
  .euiFlyoutBody__overflow {
    display: flex;
    flex: 1;
    overflow: hidden;

    .euiFlyoutBody__overflowContent {
      flex: 1;
      overflow: hidden;
      padding: ${({ theme }) => `0 ${theme.eui.paddingSizes.m} ${theme.eui.paddingSizes.m}`};
    }
  }
`;

interface EventDetailsPanelProps {
  browserFields: BrowserFields;
  docValueFields: DocValueFields[];
  entityType?: EntityType;
  expandedEvent: {
    eventId: string;
    indexName: string;
    ecsData?: Ecs;
    nonEcsData?: TimelineNonEcsData[];
    refetch?: () => void;
  };
  handleOnEventClosed: () => void;
  isDraggable?: boolean;
  isFlyoutView?: boolean;
  tabType: TimelineTabs;
  timelineId: string;
}

const EventDetailsPanelComponent: React.FC<EventDetailsPanelProps> = ({
  browserFields,
  docValueFields,
  entityType = 'events', // Default to events so only alerts have to pass entityType in
  expandedEvent,
  handleOnEventClosed,
  isDraggable,
  isFlyoutView,
  tabType,
  timelineId,
}) => {
  const [loading, detailsData, rawEventData] = useTimelineEventsDetails({
    docValueFields,
    entityType,
    indexName: expandedEvent.indexName ?? '',
    eventId: expandedEvent.eventId ?? '',
    skip: !expandedEvent.eventId,
  });

  const [isHostIsolationPanelOpen, setIsHostIsolationPanel] = useState(false);

  const [isolateAction, setIsolateAction] = useState<'isolateHost' | 'unisolateHost'>(
    'isolateHost'
  );

  const [isIsolateActionSuccessBannerVisible, setIsIsolateActionSuccessBannerVisible] =
    useState(false);

  const showAlertDetails = useCallback(() => {
    setIsHostIsolationPanel(false);
    setIsIsolateActionSuccessBannerVisible(false);
  }, []);

  const showHostIsolationPanel = useCallback((action) => {
    if (action === 'isolateHost' || action === 'unisolateHost') {
      setIsHostIsolationPanel(true);
      setIsolateAction(action);
    }
  }, []);

  const isAlert = some({ category: 'signal', field: 'signal.rule.id' }, detailsData);

  const ruleName = useMemo(
    () => getFieldValue({ category: 'signal', field: 'signal.rule.name' }, detailsData),
    [detailsData]
  );

  const alertId = useMemo(
    () => getFieldValue({ category: '_id', field: '_id' }, detailsData),
    [detailsData]
  );

  const hostName = useMemo(
    () => getFieldValue({ category: 'host', field: 'host.name' }, detailsData),
    [detailsData]
  );

  const hostRisk = useHostsRiskScore({
    hostName,
  });

  const backToAlertDetailsLink = useMemo(() => {
    return (
      <>
        <EuiButtonEmpty
          iconType="arrowLeft"
          iconSide="left"
          flush="left"
          onClick={() => showAlertDetails()}
        >
          <EuiText size="xs">
            <p>{ALERT_DETAILS}</p>
          </EuiText>
        </EuiButtonEmpty>
        <EuiTitle>
          <h2>{isolateAction === 'isolateHost' ? ISOLATE_HOST : UNISOLATE_HOST}</h2>
        </EuiTitle>
      </>
    );
  }, [showAlertDetails, isolateAction]);

  const caseDetailsRefresh = useWithCaseDetailsRefresh();

  const handleIsolationActionSuccess = useCallback(() => {
    setIsIsolateActionSuccessBannerVisible(true);
    // If a case details refresh ref is defined, then refresh actions and comments
    if (caseDetailsRefresh) {
      caseDetailsRefresh.refreshUserActionsAndComments();
    }
  }, [caseDetailsRefresh]);

  if (!expandedEvent?.eventId) {
    return null;
  }

  return isFlyoutView ? (
    <>
      <EuiFlyoutHeader hasBorder={isHostIsolationPanelOpen}>
        {isHostIsolationPanelOpen ? (
          backToAlertDetailsLink
        ) : (
          <ExpandableEventTitle isAlert={isAlert} loading={loading} ruleName={ruleName} />
        )}
      </EuiFlyoutHeader>
      {isIsolateActionSuccessBannerVisible && (
        <EndpointIsolateSuccess
          hostName={hostName}
          alertId={alertId}
          isolateAction={isolateAction}
        />
      )}
      <StyledEuiFlyoutBody>
        {isHostIsolationPanelOpen ? (
          <HostIsolationPanel
            details={detailsData}
            cancelCallback={showAlertDetails}
            successCallback={handleIsolationActionSuccess}
            isolateAction={isolateAction}
          />
        ) : (
          <ExpandableEvent
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
          />
        )}
      </StyledEuiFlyoutBody>

      <EventDetailsFooter
        detailsData={detailsData}
        expandedEvent={expandedEvent}
        handleOnEventClosed={handleOnEventClosed}
        isHostIsolationPanelOpen={isHostIsolationPanelOpen}
        loadingEventDetails={loading}
        onAddIsolationStatusClick={showHostIsolationPanel}
        timelineId={timelineId}
      />
    </>
  ) : (
    <>
      <ExpandableEventTitle
        isAlert={isAlert}
        loading={loading}
        ruleName={ruleName}
        handleOnEventClosed={handleOnEventClosed}
      />
      <EuiSpacer size="m" />
      <ExpandableEvent
        browserFields={browserFields}
        detailsData={detailsData}
        event={expandedEvent}
        isAlert={isAlert}
        isDraggable={isDraggable}
        loading={loading}
        rawEventData={rawEventData}
        timelineId={timelineId}
        timelineTabType={tabType}
        hostRisk={hostRisk}
      />
    </>
  );
};

export const EventDetailsPanel = React.memo(
  EventDetailsPanelComponent,
  (prevProps, nextProps) =>
    deepEqual(prevProps.browserFields, nextProps.browserFields) &&
    deepEqual(prevProps.docValueFields, nextProps.docValueFields) &&
    deepEqual(prevProps.expandedEvent, nextProps.expandedEvent) &&
    prevProps.timelineId === nextProps.timelineId &&
    prevProps.isDraggable === nextProps.isDraggable
);
