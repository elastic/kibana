/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAssistantOverlay } from '@kbn/elastic-assistant';
import { EuiSpacer, EuiFlyoutBody, EuiPanel } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import deepEqual from 'fast-deep-equal';
import type { EntityType } from '@kbn/timelines-plugin/common';

import { useGetFieldsData } from '../../../../common/hooks/use_get_fields_data';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';
import { getRawData } from '../../../../assistant/helpers';
import type { BrowserFields } from '../../../../common/containers/source';
import { ExpandableEvent, ExpandableEventTitle } from './expandable_event';
import { useTimelineEventsDetails } from '../../../containers/details';
import type { TimelineTabs } from '../../../../../common/types/timeline';
import type { RunTimeMappings } from '../../../../common/store/sourcerer/model';
import { useHostIsolationTools } from './use_host_isolation_tools';
import { FlyoutBody, FlyoutHeader, FlyoutFooter } from './flyout';
import { useBasicDataFromDetailsData, getAlertIndexAlias } from './helpers';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { EndpointIsolateSuccess } from '../../../../common/components/endpoint/host_isolation';
import { HostIsolationPanel } from '../../../../detections/components/host_isolation';
import {
  ALERT_SUMMARY_CONVERSATION_ID,
  ALERT_SUMMARY_CONTEXT_DESCRIPTION,
  ALERT_SUMMARY_VIEW_CONTEXT_TOOLTIP,
  EVENT_SUMMARY_CONVERSATION_ID,
  EVENT_SUMMARY_CONTEXT_DESCRIPTION,
  EVENT_SUMMARY_VIEW_CONTEXT_TOOLTIP,
  SUMMARY_VIEW,
  TIMELINE_VIEW,
} from '../../../../common/components/event_details/translations';
import {
  PROMPT_CONTEXT_ALERT_CATEGORY,
  PROMPT_CONTEXT_EVENT_CATEGORY,
  PROMPT_CONTEXTS,
} from '../../../../assistant/content/prompt_contexts';

const FlyoutFooterContainerPanel = styled(EuiPanel)`
  .side-panel-flyout-footer {
    background-color: transparent;
  }
`;

interface EventDetailsPanelProps {
  browserFields: BrowserFields;
  entityType?: EntityType;
  expandedEvent: {
    eventId: string;
    indexName: string;
    refetch?: () => void;
  };
  handleOnEventClosed: () => void;
  isDraggable?: boolean;
  isFlyoutView?: boolean;
  runtimeMappings: RunTimeMappings;
  tabType: TimelineTabs;
  scopeId: string;
  isReadOnly?: boolean;
}

const useAssistantNoop = () => ({ promptContextId: undefined });

const EventDetailsPanelComponent: React.FC<EventDetailsPanelProps> = ({
  browserFields,
  entityType = 'events', // Default to events so only alerts have to pass entityType in
  expandedEvent,
  handleOnEventClosed,
  isDraggable,
  isFlyoutView,
  runtimeMappings,
  tabType,
  scopeId,
  isReadOnly,
}) => {
  const { hasAssistantPrivilege } = useAssistantAvailability();
  // TODO: changing feature flags requires a hard refresh to take effect, but this temporary workaround technically violates the rules of hooks:
  const useAssistant = hasAssistantPrivilege ? useAssistantOverlay : useAssistantNoop;
  const currentSpaceId = useSpaceId();
  const { indexName } = expandedEvent;
  const eventIndex = getAlertIndexAlias(indexName, currentSpaceId) ?? indexName;
  const [loading, detailsData, rawEventData, ecsData, refetchFlyoutData] = useTimelineEventsDetails(
    {
      entityType,
      indexName: eventIndex ?? '',
      eventId: expandedEvent.eventId ?? '',
      runtimeMappings,
      skip: !expandedEvent.eventId,
    }
  );
  const getFieldsData = useGetFieldsData(rawEventData?.fields);

  const {
    isolateAction,
    isHostIsolationPanelOpen,
    isIsolateActionSuccessBannerVisible,
    handleIsolationActionSuccess,
    showAlertDetails,
    showHostIsolationPanel,
  } = useHostIsolationTools();

  const { alertId, isAlert, hostName, ruleName, timestamp } =
    useBasicDataFromDetailsData(detailsData);

  const view = useMemo(() => (isFlyoutView ? SUMMARY_VIEW : TIMELINE_VIEW), [isFlyoutView]);

  const getPromptContext = useCallback(async () => getRawData(detailsData ?? []), [detailsData]);

  const { promptContextId } = useAssistant(
    isAlert ? 'alert' : 'event',
    isAlert ? ALERT_SUMMARY_CONVERSATION_ID : EVENT_SUMMARY_CONVERSATION_ID,
    isAlert ? ALERT_SUMMARY_CONTEXT_DESCRIPTION(view) : EVENT_SUMMARY_CONTEXT_DESCRIPTION(view),
    getPromptContext,
    null,
    isAlert
      ? PROMPT_CONTEXTS[PROMPT_CONTEXT_ALERT_CATEGORY].suggestedUserPrompt
      : PROMPT_CONTEXTS[PROMPT_CONTEXT_EVENT_CATEGORY].suggestedUserPrompt,
    isAlert ? ALERT_SUMMARY_VIEW_CONTEXT_TOOLTIP : EVENT_SUMMARY_VIEW_CONTEXT_TOOLTIP
  );

  const header = useMemo(
    () =>
      isFlyoutView || isHostIsolationPanelOpen ? (
        <FlyoutHeader
          eventId={expandedEvent.eventId}
          eventIndex={eventIndex}
          isHostIsolationPanelOpen={isHostIsolationPanelOpen}
          isAlert={isAlert}
          isolateAction={isolateAction}
          loading={loading}
          ruleName={ruleName}
          showAlertDetails={showAlertDetails}
          timestamp={timestamp}
          promptContextId={promptContextId}
          scopeId={scopeId}
          refetchFlyoutData={refetchFlyoutData}
          getFieldsData={getFieldsData}
        />
      ) : (
        <ExpandableEventTitle
          eventId={expandedEvent.eventId}
          eventIndex={eventIndex}
          isAlert={isAlert}
          loading={loading}
          ruleName={ruleName}
          timestamp={timestamp}
          handleOnEventClosed={handleOnEventClosed}
          promptContextId={promptContextId}
          scopeId={scopeId}
          refetchFlyoutData={refetchFlyoutData}
          getFieldsData={getFieldsData}
        />
      ),
    [
      isFlyoutView,
      isHostIsolationPanelOpen,
      expandedEvent.eventId,
      eventIndex,
      isAlert,
      isolateAction,
      loading,
      ruleName,
      showAlertDetails,
      timestamp,
      promptContextId,
      handleOnEventClosed,
      scopeId,
      refetchFlyoutData,
      getFieldsData,
    ]
  );

  const body = useMemo(() => {
    if (isFlyoutView) {
      return (
        <FlyoutBody
          alertId={alertId}
          browserFields={browserFields}
          detailsData={detailsData}
          detailsEcsData={ecsData}
          event={expandedEvent}
          hostName={hostName}
          handleIsolationActionSuccess={handleIsolationActionSuccess}
          handleOnEventClosed={handleOnEventClosed}
          isAlert={isAlert}
          isDraggable={isDraggable}
          isolateAction={isolateAction}
          isIsolateActionSuccessBannerVisible={isIsolateActionSuccessBannerVisible}
          isHostIsolationPanelOpen={isHostIsolationPanelOpen}
          loading={loading}
          rawEventData={rawEventData}
          showAlertDetails={showAlertDetails}
          scopeId={scopeId}
          isReadOnly={isReadOnly}
        />
      );
    } else if (isHostIsolationPanelOpen) {
      return (
        <>
          {isIsolateActionSuccessBannerVisible && (
            <EndpointIsolateSuccess
              hostName={hostName}
              alertId={alertId}
              isolateAction={isolateAction}
            />
          )}
          <EuiFlyoutBody>
            <HostIsolationPanel
              details={detailsData}
              cancelCallback={showAlertDetails}
              successCallback={handleIsolationActionSuccess}
              isolateAction={isolateAction}
            />
          </EuiFlyoutBody>
        </>
      );
    } else {
      return (
        <>
          <EuiSpacer size="m" />
          <ExpandableEvent
            browserFields={browserFields}
            detailsData={detailsData}
            detailsEcsData={ecsData}
            event={expandedEvent}
            isAlert={isAlert}
            isDraggable={isDraggable}
            loading={loading}
            rawEventData={rawEventData}
            scopeId={scopeId}
            timelineTabType={tabType}
            handleOnEventClosed={handleOnEventClosed}
          />
        </>
      );
    }
  }, [
    alertId,
    browserFields,
    detailsData,
    ecsData,
    expandedEvent,
    handleIsolationActionSuccess,
    handleOnEventClosed,
    hostName,
    isAlert,
    isDraggable,
    isFlyoutView,
    isHostIsolationPanelOpen,
    isIsolateActionSuccessBannerVisible,
    isReadOnly,
    isolateAction,
    loading,
    rawEventData,
    showAlertDetails,
    tabType,
    scopeId,
  ]);

  if (!expandedEvent?.eventId) {
    return null;
  }

  return (
    <>
      {header}
      {body}
      <FlyoutFooterContainerPanel hasShadow={false} borderRadius="none">
        <FlyoutFooter
          detailsData={detailsData}
          detailsEcsData={ecsData}
          refetchFlyoutData={refetchFlyoutData}
          handleOnEventClosed={handleOnEventClosed}
          isHostIsolationPanelOpen={isHostIsolationPanelOpen}
          isReadOnly={isReadOnly}
          loadingEventDetails={loading}
          onAddIsolationStatusClick={showHostIsolationPanel}
          scopeId={scopeId}
        />
      </FlyoutFooterContainerPanel>
    </>
  );
};

export const EventDetailsPanel = React.memo(
  EventDetailsPanelComponent,
  (prevProps, nextProps) =>
    deepEqual(prevProps.browserFields, nextProps.browserFields) &&
    deepEqual(prevProps.expandedEvent, nextProps.expandedEvent) &&
    prevProps.scopeId === nextProps.scopeId &&
    prevProps.isDraggable === nextProps.isDraggable
);
