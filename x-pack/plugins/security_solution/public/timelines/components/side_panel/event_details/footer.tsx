/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyoutFooter, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { TakeActionDropdown } from '../../../../detections/components/take_action_dropdown';
import type { TimelineEventsDetailsItem, TimelineNonEcsData } from '../../../../../common';
import type { Ecs } from '../../../../../common/ecs';
import { useExceptionModal } from '../../../../detections/components/alerts_table/timeline_actions/use_add_exception_modal';
import { AddExceptionModalWrapper } from '../../../../detections/components/alerts_table/timeline_actions/alert_context_menu';
import { EventFiltersModal } from '../../../../management/pages/event_filters/view/components/modal';
import { useEventFilterModal } from '../../../../detections/components/alerts_table/timeline_actions/use_event_filter_modal';

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
  isAlert: boolean;
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
    isAlert,
    isHostIsolationPanelOpen,
    loadingEventDetails,
    onAddIsolationStatusClick,
    timelineId,
  }: EventDetailsFooterProps) => {
    const {
      alertStatus,
      exceptionModalType,
      ruleId,
      ruleName,
      ruleIndices,
      onAddExceptionTypeClick,
      onAddExceptionCancel,
      onAddExceptionConfirm,
    } = useExceptionModal({
      ecsData: expandedEvent?.ecsData,
      refetch: expandedEvent?.refetch,
      timelineId,
    });
    const {
      closeAddEventFilterModal,
      isAddEventFilterModalOpen,
      onAddEventFilterClick,
    } = useEventFilterModal();
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
        {exceptionModalType != null && ruleId != null && expandedEvent?.ecsData != null && (
          <AddExceptionModalWrapper
            ruleName={ruleName}
            ruleId={ruleId}
            ruleIndices={ruleIndices}
            exceptionListType={exceptionModalType}
            ecsData={expandedEvent?.ecsData}
            onCancel={onAddExceptionCancel}
            onConfirm={onAddExceptionConfirm}
            alertStatus={alertStatus}
          />
        )}
        {isAddEventFilterModalOpen && expandedEvent?.ecsData != null && (
          <EventFiltersModal data={expandedEvent?.ecsData} onCancel={closeAddEventFilterModal} />
        )}
      </>
    );
  }
);
