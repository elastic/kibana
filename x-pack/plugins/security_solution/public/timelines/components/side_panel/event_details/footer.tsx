/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlyoutFooter, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { find, get, isEmpty } from 'lodash/fp';
import { TakeActionDropdown } from '../../../../detections/components/take_action_dropdown';
import type { TimelineEventsDetailsItem } from '../../../../../common';
import { useExceptionModal } from '../../../../detections/components/alerts_table/timeline_actions/use_add_exception_modal';
import { AddExceptionModalWrapper } from '../../../../detections/components/alerts_table/timeline_actions/alert_context_menu';
import { EventFiltersModal } from '../../../../management/pages/event_filters/view/components/modal';
import { useEventFilterModal } from '../../../../detections/components/alerts_table/timeline_actions/use_event_filter_modal';
import { getFieldValue } from '../../../../detections/components/host_isolation/helpers';
import { Status } from '../../../../../common/detection_engine/schemas/common/schemas';
import { Ecs } from '../../../../../common/ecs';
import { useFetchEcsAlertsData } from '../../../../detections/containers/detection_engine/alerts/use_fetch_ecs_alerts_data';

interface EventDetailsFooterProps {
  detailsData: TimelineEventsDetailsItem[] | null;
  expandedEvent: {
    eventId: string;
    indexName: string;
    ecsData?: Ecs;
    refetch?: () => void;
  };
  handleOnEventClosed: () => void;
  isHostIsolationPanelOpen: boolean;
  loadingEventDetails: boolean;
  onAddIsolationStatusClick: (action: 'isolateHost' | 'unisolateHost') => void;
  timelineId: string;
}

interface AddExceptionModalWrapperData {
  alertStatus: Status;
  eventId: string;
  ruleId: string;
  ruleName: string;
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
    const ruleIndex = useMemo(
      () => find({ category: 'signal', field: 'signal.rule.index' }, detailsData)?.values,
      [detailsData]
    );

    const addExceptionModalWrapperData = useMemo(
      () =>
        [
          { category: 'signal', field: 'signal.rule.id', name: 'ruleId' },
          { category: 'signal', field: 'signal.rule.name', name: 'ruleName' },
          { category: 'signal', field: 'signal.status', name: 'alertStatus' },
          { category: '_id', field: '_id', name: 'eventId' },
        ].reduce<AddExceptionModalWrapperData>(
          (acc, curr) => ({
            ...acc,
            [curr.name]: getFieldValue({ category: curr.category, field: curr.field }, detailsData),
          }),
          {} as AddExceptionModalWrapperData
        ),
      [detailsData]
    );

    const eventIds = useMemo(
      () => (isEmpty(expandedEvent?.eventId) ? null : [expandedEvent?.eventId]),
      [expandedEvent?.eventId]
    );

    const {
      exceptionModalType,
      onAddExceptionTypeClick,
      onAddExceptionCancel,
      onAddExceptionConfirm,
      ruleIndices,
    } = useExceptionModal({
      ruleIndex,
      refetch: expandedEvent?.refetch,
      timelineId,
    });
    const { closeAddEventFilterModal, isAddEventFilterModalOpen, onAddEventFilterClick } =
      useEventFilterModal();

    const { alertsEcsData } = useFetchEcsAlertsData({
      alertIds: eventIds,
      skip: expandedEvent?.eventId == null,
    });

    const ecsData = expandedEvent.ecsData ?? get(0, alertsEcsData);
    return (
      <>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              {ecsData && (
                <TakeActionDropdown
                  detailsData={detailsData}
                  ecsData={ecsData}
                  handleOnEventClosed={handleOnEventClosed}
                  isHostIsolationPanelOpen={isHostIsolationPanelOpen}
                  loadingEventDetails={loadingEventDetails}
                  onAddEventFilterClick={onAddEventFilterClick}
                  onAddExceptionTypeClick={onAddExceptionTypeClick}
                  onAddIsolationStatusClick={onAddIsolationStatusClick}
                  refetch={expandedEvent?.refetch}
                  indexName={expandedEvent.indexName}
                  timelineId={timelineId}
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
        {/* This is still wrong to do render flyout/modal inside of the flyout
        We need to completely refactor the EventDetails  component to be correct
      */}
        {exceptionModalType != null &&
          addExceptionModalWrapperData.ruleId != null &&
          addExceptionModalWrapperData.eventId != null && (
            <AddExceptionModalWrapper
              {...addExceptionModalWrapperData}
              ruleIndices={ruleIndices}
              exceptionListType={exceptionModalType}
              onCancel={onAddExceptionCancel}
              onConfirm={onAddExceptionConfirm}
            />
          )}
        {isAddEventFilterModalOpen && ecsData != null && (
          <EventFiltersModal data={ecsData} onCancel={closeAddEventFilterModal} />
        )}
      </>
    );
  }
);
