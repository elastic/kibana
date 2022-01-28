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
import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { BrowserFields, DocValueFields } from '../../../../common/containers/source';
import { ExpandableEvent, ExpandableEventTitle } from './expandable_event';
import { useTimelineEventsDetails } from '../../../containers/details';
import { TimelineTabs } from '../../../../../common/types/timeline';
import { HostIsolationPanel } from '../../../../detections/components/host_isolation';
import { EndpointIsolateSuccess } from '../../../../common/components/endpoint/host_isolation';
import {
  ISOLATE_HOST,
  RUN_OSQUERY,
  UNISOLATE_HOST,
} from '../../../../detections/components/host_isolation/translations';
import { getFieldValue } from '../../../../detections/components/host_isolation/helpers';
import { ALERT_DETAILS } from './translations';
import { useWithCaseDetailsRefresh } from '../../../../common/components/endpoint/host_isolation/endpoint_host_isolation_cases_context';
import { EventDetailsFooter } from './footer';
import { EntityType } from '../../../../../../timelines/common';
import { useHostsRiskScore } from '../../../../common/containers/hosts_risk/use_hosts_risk_score';
import { useKibana } from '../../../../common/lib/kibana';

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
const OsqueryActionWrapper = styled.div`
  padding: 8px;
`;

interface EventDetailsPanelProps {
  browserFields: BrowserFields;
  docValueFields: DocValueFields[];
  entityType?: EntityType;
  expandedEvent: {
    eventId: string;
    indexName: string;
    refetch?: () => void;
  };
  handleOnEventClosed: () => void;
  isDraggable?: boolean;
  isFlyoutView?: boolean;
  runtimeMappings: MappingRuntimeFields;
  tabType: TimelineTabs;
  timelineId: string;
}

export enum ACTIVE_PANEL {
  HOST_ISOLATION = 0,
  OSQUERY = 1,
}

const EventDetailsPanelComponent: React.FC<EventDetailsPanelProps> = ({
  browserFields,
  docValueFields,
  entityType = 'events', // Default to events so only alerts have to pass entityType in
  expandedEvent,
  handleOnEventClosed,
  isDraggable,
  isFlyoutView,
  runtimeMappings,
  tabType,
  timelineId,
}) => {
  const [loading, detailsData, rawEventData, ecsData] = useTimelineEventsDetails({
    docValueFields,
    entityType,
    indexName: expandedEvent.indexName ?? '',
    eventId: expandedEvent.eventId ?? '',
    runtimeMappings,
    skip: !expandedEvent.eventId,
  });

  const {
    services: { osquery },
  } = useKibana();
  const [isActivePanel, setIsActivePanel] = useState<number | null>(null);
  const [isolateAction, setIsolateAction] = useState<'isolateHost' | 'unisolateHost'>(
    'isolateHost'
  );
  const [isIsolateActionSuccessBannerVisible, setIsIsolateActionSuccessBannerVisible] =
    useState(false);

  const showAlertDetails = useCallback(() => {
    setIsActivePanel(null);
    setIsIsolateActionSuccessBannerVisible(false);
  }, []);

  const showHostIsolationPanel = useCallback((action) => {
    if (action === 'isolateHost' || action === 'unisolateHost') {
      setIsActivePanel(ACTIVE_PANEL.HOST_ISOLATION);
      setIsolateAction(action);
    }
  }, []);

  const isAlert = some({ category: 'kibana', field: 'kibana.alert.rule.uuid' }, detailsData);

  const ruleName = useMemo(
    () => getFieldValue({ category: 'kibana', field: 'kibana.alert.rule.name' }, detailsData),
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

  const timestamp = useMemo(
    () => getFieldValue({ category: 'base', field: '@timestamp' }, detailsData),
    [detailsData]
  );

  const agentId = useMemo(
    () => getFieldValue({ category: 'agent', field: 'agent.id' }, detailsData),
    [detailsData]
  );

  const backToAlertDetailsLink = useCallback(
    (primaryText) => {
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
          <EuiTitle>{primaryText}</EuiTitle>
        </>
      );
    },
    [showAlertDetails]
  );

  const caseDetailsRefresh = useWithCaseDetailsRefresh();

  const handleIsolationActionSuccess = useCallback(() => {
    setIsIsolateActionSuccessBannerVisible(true);
    // If a case details refresh ref is defined, then refresh actions and comments
    if (caseDetailsRefresh) {
      caseDetailsRefresh.refreshCase();
    }
  }, [caseDetailsRefresh]);

  const renderFlyoutHeader = useMemo(() => {
    let text;
    switch (isActivePanel) {
      case ACTIVE_PANEL.OSQUERY:
        text = <h2>{RUN_OSQUERY}</h2>;
        return backToAlertDetailsLink(text);
      case ACTIVE_PANEL.HOST_ISOLATION:
        text = <h2>{isolateAction === 'isolateHost' ? ISOLATE_HOST : UNISOLATE_HOST}</h2>;
        return backToAlertDetailsLink(text);
      default:
        return (
          <ExpandableEventTitle
            isAlert={isAlert}
            loading={loading}
            ruleName={ruleName}
            timestamp={timestamp}
          />
        );
    }
  }, [backToAlertDetailsLink, isActivePanel, isAlert, isolateAction, loading, ruleName, timestamp]);
  const renderFlyoutBody = useMemo(() => {
    switch (isActivePanel) {
      case ACTIVE_PANEL.OSQUERY:
        return (
          <OsqueryActionWrapper>
            {osquery?.OsqueryAction?.({ agentId, formType: 'steps' })}
          </OsqueryActionWrapper>
        );
      // return <OsqueryLiveQuery agentId={agentId} formType={'steps'} />;
      case ACTIVE_PANEL.HOST_ISOLATION:
        return (
          <HostIsolationPanel
            details={detailsData}
            cancelCallback={showAlertDetails}
            successCallback={handleIsolationActionSuccess}
            isolateAction={isolateAction}
          />
        );
      default:
        return (
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
            handleOnEventClosed={handleOnEventClosed}
          />
        );
    }
  }, [
    agentId,
    browserFields,
    detailsData,
    expandedEvent,
    handleIsolationActionSuccess,
    handleOnEventClosed,
    hostRisk,
    isActivePanel,
    isAlert,
    isDraggable,
    isolateAction,
    loading,
    osquery,
    rawEventData,
    showAlertDetails,
    timelineId,
  ]);

  if (!expandedEvent?.eventId) {
    return null;
  }

  const handlePanelChange = (panelType: ACTIVE_PANEL | null) => {
    if (isActivePanel === ACTIVE_PANEL.OSQUERY && panelType === null) {
      showAlertDetails();
      return;
    }
    setIsActivePanel(panelType);
  };

  return isFlyoutView ? (
    <>
      <EuiFlyoutHeader hasBorder={isActivePanel != null}>{renderFlyoutHeader}</EuiFlyoutHeader>
      {isIsolateActionSuccessBannerVisible && (
        <EndpointIsolateSuccess
          hostName={hostName}
          alertId={alertId}
          isolateAction={isolateAction}
        />
      )}
      <StyledEuiFlyoutBody>{renderFlyoutBody}</StyledEuiFlyoutBody>

      <EventDetailsFooter
        detailsData={detailsData}
        detailsEcsData={ecsData}
        expandedEvent={expandedEvent}
        handleOnEventClosed={handleOnEventClosed}
        isHostIsolationPanelOpen={isActivePanel === ACTIVE_PANEL.HOST_ISOLATION}
        loadingEventDetails={loading}
        onAddIsolationStatusClick={showHostIsolationPanel}
        timelineId={timelineId}
        handlePanelChange={handlePanelChange}
        preventTakeActionDropdown={isActivePanel === ACTIVE_PANEL.OSQUERY}
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
        handleOnEventClosed={handleOnEventClosed}
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
