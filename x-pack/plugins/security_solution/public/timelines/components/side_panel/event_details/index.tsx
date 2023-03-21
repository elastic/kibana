/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiFlyoutBody } from '@elastic/eui';
import React, { useMemo } from 'react';

import deepEqual from 'fast-deep-equal';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { EntityType } from '@kbn/timelines-plugin/common';
import type { BrowserFields } from '../../../../common/containers/source';
import { ExpandableEvent, ExpandableEventTitle } from './expandable_event';
import { useTimelineEventsDetails } from '../../../containers/details';
import type { TimelineTabs } from '../../../../../common/types/timeline';
import { useHostIsolationTools } from './use_host_isolation_tools';
import { FlyoutBody, FlyoutHeader, FlyoutFooter } from './flyout';
import { useBasicDataFromDetailsData, getAlertIndexAlias } from './helpers';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { EndpointIsolateSuccess } from '../../../../common/components/endpoint/host_isolation';
import { HostIsolationPanel } from '../../../../detections/components/host_isolation';

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
  runtimeMappings: MappingRuntimeFields;
  tabType: TimelineTabs;
  scopeId: string;
  isReadOnly?: boolean;
}

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

  const header = useMemo(
    () =>
      isFlyoutView || isHostIsolationPanelOpen ? (
        <FlyoutHeader
          eventId={expandedEvent.eventId}
          isHostIsolationPanelOpen={isHostIsolationPanelOpen}
          isAlert={isAlert}
          isolateAction={isolateAction}
          loading={loading}
          ruleName={ruleName}
          showAlertDetails={showAlertDetails}
          timestamp={timestamp}
        />
      ) : (
        <ExpandableEventTitle
          eventId={expandedEvent.eventId}
          isAlert={isAlert}
          loading={loading}
          ruleName={ruleName}
          handleOnEventClosed={handleOnEventClosed}
        />
      ),
    [
      expandedEvent.eventId,
      handleOnEventClosed,
      isAlert,
      isFlyoutView,
      isHostIsolationPanelOpen,
      isolateAction,
      loading,
      ruleName,
      showAlertDetails,
      timestamp,
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
      <FlyoutFooter
        detailsData={detailsData}
        detailsEcsData={ecsData}
        expandedEvent={expandedEvent}
        refetchFlyoutData={refetchFlyoutData}
        handleOnEventClosed={handleOnEventClosed}
        isHostIsolationPanelOpen={isHostIsolationPanelOpen}
        isReadOnly={isReadOnly}
        loadingEventDetails={loading}
        onAddIsolationStatusClick={showHostIsolationPanel}
        scopeId={scopeId}
      />
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
