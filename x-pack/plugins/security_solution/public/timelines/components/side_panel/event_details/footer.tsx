/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlyoutFooter, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { find, get } from 'lodash/fp';
import { TakeActionDropdown } from '../../../../detections/components/take_action_dropdown';
import type { TimelineEventsDetailsItem, TimelineNonEcsData } from '../../../../../common';
import type { Ecs } from '../../../../../common/ecs';
import { useExceptionModal } from '../../../../detections/components/alerts_table/timeline_actions/use_add_exception_modal';
import { AddExceptionModalWrapper } from '../../../../detections/components/alerts_table/timeline_actions/alert_context_menu';
import { EventFiltersModal } from '../../../../management/pages/event_filters/view/components/modal';
import { useEventFilterModal } from '../../../../detections/components/alerts_table/timeline_actions/use_event_filter_modal';
import { getFieldValue } from '../../../../detections/components/host_isolation/helpers';
import { Status } from '../../../../../common/detection_engine/schemas/common/schemas';

interface EventDetailsFooterProps {
  detailsData: TimelineEventsDetailsItem[] | null;
  expandedEvent: {
    eventId: string;
    indexName: string;
    ecsData?: Ecs;
    nonEcsData?: TimelineNonEcsData[];
    refetch?: () => void;
  };
  handleOnEventClosed: () => void;
  isHostIsolationPanelOpen: boolean;
  loadingEventDetails: boolean;
  onAddIsolationStatusClick: (action: 'isolateHost' | 'unisolateHost') => void;
  timelineId: string;
}

export const EventDetailsFooter = React.memo(
  ({
    detailsData,
    expandedEvent,
    handleOnEventClosed,
    isHostIsolationPanelOpen,
    loadingEventDetails,
    onAddIsolationStatusClick,
    timelineId,
  }: EventDetailsFooterProps) => {
    const ruleId = useMemo(
      () => getFieldValue({ category: 'signal', field: 'signal.rule.id' }, detailsData),
      [detailsData]
    );
    const ruleName = useMemo(
      () => getFieldValue({ category: 'signal', field: 'signal.rule.name' }, detailsData),
      [detailsData]
    );
    const ruleIndex = useMemo(
      () => find({ category: 'signal', field: 'signal.rule.index' }, detailsData)?.values,
      [detailsData]
    );
    const alertStatus = useMemo(
      () => getFieldValue({ category: 'signal', field: 'signal.status' }, detailsData),
      [detailsData]
    ) as Status;

    const eventId =
      expandedEvent?.eventId ??
      useMemo(() => getFieldValue({ category: '_id', field: '_id' }, detailsData), [detailsData]);
    const indexName = useMemo(
      () => getFieldValue({ category: '_index', field: '_index' }, detailsData),
      [detailsData]
    );
    const timestamp = useMemo(
      () => getFieldValue({ category: 'base', field: 'timestamp' }, detailsData),
      [detailsData]
    );

    const {
      alertsEcsData,
      exceptionModalType,
      onAddExceptionTypeClick,
      onAddExceptionCancel,
      onAddExceptionConfirm,
      ruleIndices,
    } = useExceptionModal({
      eventId,
      ruleIndex,
      refetch: expandedEvent?.refetch,
      timelineId,
    });
    const {
      closeAddEventFilterModal,
      isAddEventFilterModalOpen,
      onAddEventFilterClick,
    } = useEventFilterModal();

    const ecsData = get(0, alertsEcsData);
    return (
      <>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <TakeActionDropdown
                detailsData={detailsData}
                ecsData={expandedEvent?.ecsData}
                handleOnEventClosed={handleOnEventClosed}
                isHostIsolationPanelOpen={isHostIsolationPanelOpen}
                loadingEventDetails={loadingEventDetails}
                nonEcsData={expandedEvent?.nonEcsData}
                onAddEventFilterClick={onAddEventFilterClick}
                onAddExceptionTypeClick={onAddExceptionTypeClick}
                onAddIsolationStatusClick={onAddIsolationStatusClick}
                refetch={expandedEvent?.refetch}
                timelineId={timelineId}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
        {/* This is still wrong to do render flyout/modal inside of the flyout
        We need to completely refactor the EventDetails  component to be correct
      */}
        {exceptionModalType != null && ruleId != null && eventId != null && (
          <AddExceptionModalWrapper
            alertStatus={alertStatus}
            ruleName={ruleName}
            ruleId={ruleId}
            ruleIndices={ruleIndices}
            exceptionListType={exceptionModalType}
            eventId={eventId}
            onCancel={onAddExceptionCancel}
            onConfirm={onAddExceptionConfirm}
          />
        )}
        {isAddEventFilterModalOpen && (ecsData != null || expandedEvent?.ecsData != null) && (
          <EventFiltersModal
            ecsData={expandedEvent?.ecsData ?? ecsData!}
            eventId={eventId}
            indexName={indexName}
            timestamp={timestamp}
            onCancel={closeAddEventFilterModal}
          />
        )}
      </>
    );
  }
);
