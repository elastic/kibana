/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { some } from 'lodash/fp';
import { EuiFlyoutHeader, EuiFlyoutBody, EuiSpacer } from '@elastic/eui';
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
import { EndpointIsolateSuccess } from '../../../../common/components/endpoint/host_isolation';
import { getFieldValue } from '../../../../detections/components/host_isolation/helpers';
import { useWithCaseDetailsRefresh } from '../../../../common/components/endpoint/host_isolation/endpoint_host_isolation_cases_context';
import { EntityType } from '../../../../../../timelines/common';
import {
  EventDetailsFlyoutBody,
  EventDetailsFlyoutFooter,
  EventDetailsFlyoutHeader,
} from '../flyout';
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

  const [activePanel, setActivePanel] = useState<number | null>(null);
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
    setActivePanel(null);
    setIsIsolateActionSuccessBannerVisible(false);
  }, []);

  const showHostIsolationPanel = useCallback((action) => {
    if (action === 'isolateHost' || action === 'unisolateHost') {
      setActivePanel(ACTIVE_PANEL.HOST_ISOLATION);
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

  const hostRisk: HostRisk | null = useMemo(
    () =>
      data
        ? {
            loading: hostRiskLoading,
            isModuleEnabled,
            result: data,
          }
        : null,
    [data, hostRiskLoading, isModuleEnabled]
  );

  const timestamp = useMemo(
    () => getFieldValue({ category: 'base', field: '@timestamp' }, detailsData),
    [detailsData]
  );

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
      <EuiFlyoutHeader hasBorder={activePanel != null}>
        <EventDetailsFlyoutHeader
          activePanel={activePanel}
          isAlert={isAlert}
          isolateAction={isolateAction}
          loading={loading}
          ruleName={ruleName}
          showAlertDetails={showAlertDetails}
          timestamp={timestamp}
        />
      </EuiFlyoutHeader>
      {isIsolateActionSuccessBannerVisible && (
        <EndpointIsolateSuccess
          hostName={hostName}
          alertId={alertId}
          isolateAction={isolateAction}
        />
      )}
      <StyledEuiFlyoutBody>
        <EventDetailsFlyoutBody
          browserFields={browserFields}
          detailsData={detailsData}
          expandedEvent={expandedEvent}
          handleIsolationActionSuccess={handleIsolationActionSuccess}
          handleOnEventClosed={handleOnEventClosed}
          hostRisk={hostRisk}
          activePanel={activePanel}
          isAlert={isAlert}
          isDraggable={isDraggable}
          isolateAction={isolateAction}
          loading={loading}
          rawEventData={rawEventData}
          showAlertDetails={showAlertDetails}
          timelineId={timelineId}
        />
      </StyledEuiFlyoutBody>

      <EventDetailsFlyoutFooter
        activePanel={activePanel}
        detailsData={detailsData}
        ecsData={ecsData}
        expandedEvent={expandedEvent}
        handleOnEventClosed={handleOnEventClosed}
        loading={loading}
        showAlertDetails={showAlertDetails}
        showHostIsolationPanel={showHostIsolationPanel}
        timelineId={timelineId}
        setActivePanel={setActivePanel}
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
      <EventDetailsFlyoutFooter
        activePanel={activePanel}
        detailsData={detailsData}
        ecsData={ecsData}
        expandedEvent={expandedEvent}
        handleOnEventClosed={handleOnEventClosed}
        loading={loading}
        showAlertDetails={showAlertDetails}
        showHostIsolationPanel={showHostIsolationPanel}
        timelineId={timelineId}
        setActivePanel={setActivePanel}
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
