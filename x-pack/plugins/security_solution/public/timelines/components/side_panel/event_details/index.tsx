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
import { useKibana, useGetUserCasesPermissions } from '../../../../common/lib/kibana';
import { APP_ID } from '../../../../../common/constants';
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
import { EventDetailsFooter } from './footer';
import { EntityType } from '../../../../../../timelines/common';
import { buildHostNamesFilter } from '../../../../../common/search_strategy';
import { useHostRiskScore, HostRisk } from '../../../../risk_score/containers';

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
    refetch?: () => void;
  };
  handleOnEventClosed: () => void;
  isDraggable?: boolean;
  isFlyoutView?: boolean;
  runtimeMappings: MappingRuntimeFields;
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
  runtimeMappings,
  tabType,
  timelineId,
}) => {
  const [loading, detailsData, rawEventData, ecsData, refetchFlyoutData] = useTimelineEventsDetails(
    {
      docValueFields,
      entityType,
      indexName: expandedEvent.indexName ?? '',
      eventId: expandedEvent.eventId ?? '',
      runtimeMappings,
      skip: !expandedEvent.eventId,
    }
  );

  const [isHostIsolationPanelOpen, setIsHostIsolationPanel] = useState(false);

  const [isolateAction, setIsolateAction] = useState<'isolateHost' | 'unisolateHost'>(
    'isolateHost'
  );

  const {
    services: { cases },
  } = useKibana();

  const CasesContext = cases.ui.getCasesContext();
  const casesPermissions = useGetUserCasesPermissions();

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

  const [hostRiskLoading, { data, isModuleEnabled }] = useHostRiskScore({
    filterQuery: hostName ? buildHostNamesFilter([hostName]) : undefined,
    pagination: {
      cursorStart: 0,
      querySize: 1,
    },
  });

  const hostRisk: HostRisk | null = data
    ? {
        loading: hostRiskLoading,
        isModuleEnabled,
        result: data,
      }
    : null;

  const timestamp = useMemo(
    () => getFieldValue({ category: 'base', field: '@timestamp' }, detailsData),
    [detailsData]
  );

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
      caseDetailsRefresh.refreshCase();
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
          <ExpandableEventTitle
            isAlert={isAlert}
            loading={loading}
            ruleName={ruleName}
            timestamp={timestamp}
          />
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
            handleOnEventClosed={handleOnEventClosed}
          />
        )}
      </StyledEuiFlyoutBody>

      <EventDetailsFooter
        detailsData={detailsData}
        detailsEcsData={ecsData}
        expandedEvent={expandedEvent}
        refetchFlyoutData={refetchFlyoutData}
        handleOnEventClosed={handleOnEventClosed}
        isHostIsolationPanelOpen={isHostIsolationPanelOpen}
        loadingEventDetails={loading}
        onAddIsolationStatusClick={showHostIsolationPanel}
        timelineId={timelineId}
      />
    </>
  ) : (
    <CasesContext owner={[APP_ID]} userCanCrud={casesPermissions?.crud ?? false}>
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
      <EventDetailsFooter
        detailsData={detailsData}
        detailsEcsData={ecsData}
        expandedEvent={expandedEvent}
        handleOnEventClosed={handleOnEventClosed}
        isHostIsolationPanelOpen={isHostIsolationPanelOpen}
        loadingEventDetails={loading}
        onAddIsolationStatusClick={showHostIsolationPanel}
        refetchFlyoutData={refetchFlyoutData}
        timelineId={timelineId}
      />
    </CasesContext>
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
