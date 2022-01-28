/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlyoutFooter, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { find, get, isEmpty } from 'lodash/fp';
import { connect, ConnectedProps } from 'react-redux';
import { TakeActionDropdown } from '../../../../detections/components/take_action_dropdown';
import type { TimelineEventsDetailsItem } from '../../../../../common/search_strategy';
import { TimelineId } from '../../../../../common/types';
import { useExceptionModal } from '../../../../detections/components/alerts_table/timeline_actions/use_add_exception_modal';
import { AddExceptionFlyoutWrapper } from '../../../../detections/components/alerts_table/timeline_actions/alert_context_menu';
import { EventFiltersFlyout } from '../../../../management/pages/event_filters/view/components/flyout';
import { useEventFilterModal } from '../../../../detections/components/alerts_table/timeline_actions/use_event_filter_modal';
import { getFieldValue } from '../../../../detections/components/host_isolation/helpers';
import { Status } from '../../../../../common/detection_engine/schemas/common/schemas';
import { Ecs } from '../../../../../common/ecs';
import { useFetchEcsAlertsData } from '../../../../detections/containers/detection_engine/alerts/use_fetch_ecs_alerts_data';
import { inputsModel, inputsSelectors, State } from '../../../../common/store';

interface EventDetailsFooterProps {
  detailsData: TimelineEventsDetailsItem[] | null;
  detailsEcsData: Ecs | null;
  expandedEvent: {
    eventId: string;
    indexName: string;
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

export const EventDetailsFooterComponent = React.memo(
  ({
    detailsData,
    detailsEcsData,
    expandedEvent,
    handleOnEventClosed,
    isHostIsolationPanelOpen,
    loadingEventDetails,
    onAddIsolationStatusClick,
    timelineId,
    globalQuery,
    timelineQuery,
  }: EventDetailsFooterProps & PropsFromRedux) => {
    const ruleIndex = useMemo(
      () =>
        find({ category: 'signal', field: 'signal.rule.index' }, detailsData)?.values ??
        find({ category: 'kibana', field: 'kibana.alert.rule.parameters.index' }, detailsData)
          ?.values,
      [detailsData]
    );

    const addExceptionModalWrapperData = useMemo(
      () =>
        [
          { category: 'signal', field: 'signal.rule.id', name: 'ruleId' },
          { category: 'signal', field: 'signal.rule.name', name: 'ruleName' },
          { category: 'signal', field: 'kibana.alert.workflow_status', name: 'alertStatus' },
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

    const refetchQuery = (newQueries: inputsModel.GlobalQuery[]) => {
      newQueries.forEach((q) => q.refetch && (q.refetch as inputsModel.Refetch)());
    };

    const refetchAll = useCallback(() => {
      if (timelineId === TimelineId.active) {
        refetchQuery([timelineQuery]);
      } else {
        refetchQuery(globalQuery);
      }
    }, [timelineId, globalQuery, timelineQuery]);

    const {
      exceptionModalType,
      onAddExceptionTypeClick,
      onAddExceptionCancel,
      onAddExceptionConfirm,
      ruleIndices,
    } = useExceptionModal({
      ruleIndex,
      refetch: refetchAll,
      timelineId,
    });
    const { closeAddEventFilterModal, isAddEventFilterModalOpen, onAddEventFilterClick } =
      useEventFilterModal();

    const { alertsEcsData } = useFetchEcsAlertsData({
      alertIds: eventIds,
      skip: expandedEvent?.eventId == null,
    });

    const ecsData = detailsEcsData ?? get(0, alertsEcsData);
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
                  refetch={refetchAll}
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
            <AddExceptionFlyoutWrapper
              {...addExceptionModalWrapperData}
              ruleIndices={ruleIndices}
              exceptionListType={exceptionModalType}
              onCancel={onAddExceptionCancel}
              onConfirm={onAddExceptionConfirm}
            />
          )}
        {isAddEventFilterModalOpen && ecsData != null && (
          <EventFiltersFlyout data={ecsData} onCancel={closeAddEventFilterModal} />
        )}
      </>
    );
  }
);

const makeMapStateToProps = () => {
  const getGlobalQueries = inputsSelectors.globalQuery();
  const getTimelineQuery = inputsSelectors.timelineQueryByIdSelector();
  const mapStateToProps = (state: State, { timelineId }: EventDetailsFooterProps) => {
    return {
      globalQuery: getGlobalQueries(state),
      timelineQuery: getTimelineQuery(state, timelineId),
    };
  };
  return mapStateToProps;
};

const connector = connect(makeMapStateToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const EventDetailsFooter = connector(React.memo(EventDetailsFooterComponent));
