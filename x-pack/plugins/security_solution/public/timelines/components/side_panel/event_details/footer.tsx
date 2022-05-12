/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFlyoutFooter, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { find } from 'lodash/fp';
import { connect, ConnectedProps } from 'react-redux';
import { TakeActionDropdown } from '../../../../detections/components/take_action_dropdown';
import type { TimelineEventsDetailsItem } from '../../../../../common/search_strategy';
import { TimelineId } from '../../../../../common/types';
import { useExceptionFlyout } from '../../../../detections/components/alerts_table/timeline_actions/use_add_exception_flyout';
import { AddExceptionFlyoutWrapper } from '../../../../detections/components/alerts_table/timeline_actions/alert_context_menu';
import { EventFiltersFlyout } from '../../../../management/pages/event_filters/view/components/flyout';
import { useEventFilterModal } from '../../../../detections/components/alerts_table/timeline_actions/use_event_filter_modal';
import { getFieldValue } from '../../../../detections/components/host_isolation/helpers';
import { Status } from '../../../../../common/detection_engine/schemas/common/schemas';
import { Ecs } from '../../../../../common/ecs';
import { inputsModel, inputsSelectors, State } from '../../../../common/store';
import { OsqueryFlyout } from '../../../../detections/components/osquery/osquery_flyout';

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
  refetchFlyoutData: () => Promise<void>;
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
    refetchFlyoutData,
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
      exceptionFlyoutType,
      onAddExceptionTypeClick,
      onAddExceptionCancel,
      onAddExceptionConfirm,
      ruleIndices,
    } = useExceptionFlyout({
      ruleIndex,
      refetch: refetchAll,
      timelineId,
    });
    const { closeAddEventFilterModal, isAddEventFilterModalOpen, onAddEventFilterClick } =
      useEventFilterModal();

    const [isOsqueryFlyoutOpenWithAgentId, setOsqueryFlyoutOpenWithAgentId] = useState<
      null | string
    >(null);

    const closeOsqueryFlyout = useCallback(() => {
      setOsqueryFlyoutOpenWithAgentId(null);
    }, [setOsqueryFlyoutOpenWithAgentId]);

    return (
      <>
        <EuiFlyoutFooter data-test-subj="side-panel-flyout-footer">
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              {detailsEcsData && (
                <TakeActionDropdown
                  detailsData={detailsData}
                  ecsData={detailsEcsData}
                  handleOnEventClosed={handleOnEventClosed}
                  isHostIsolationPanelOpen={isHostIsolationPanelOpen}
                  loadingEventDetails={loadingEventDetails}
                  onAddEventFilterClick={onAddEventFilterClick}
                  onAddExceptionTypeClick={onAddExceptionTypeClick}
                  onAddIsolationStatusClick={onAddIsolationStatusClick}
                  refetchFlyoutData={refetchFlyoutData}
                  refetch={refetchAll}
                  indexName={expandedEvent.indexName}
                  timelineId={timelineId}
                  onOsqueryClick={setOsqueryFlyoutOpenWithAgentId}
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
        {/* This is still wrong to do render flyout/modal inside of the flyout
        We need to completely refactor the EventDetails  component to be correct
      */}
        {exceptionFlyoutType != null &&
          addExceptionModalWrapperData.ruleId != null &&
          addExceptionModalWrapperData.eventId != null && (
            <AddExceptionFlyoutWrapper
              {...addExceptionModalWrapperData}
              ruleIndices={ruleIndices}
              exceptionListType={exceptionFlyoutType}
              onCancel={onAddExceptionCancel}
              onConfirm={onAddExceptionConfirm}
            />
          )}
        {isAddEventFilterModalOpen && detailsEcsData != null && (
          <EventFiltersFlyout
            data={detailsEcsData}
            onCancel={closeAddEventFilterModal}
            maskProps={{ style: 'z-index: 5000' }}
          />
        )}
        {isOsqueryFlyoutOpenWithAgentId && detailsEcsData != null && (
          <OsqueryFlyout agentId={isOsqueryFlyoutOpenWithAgentId} onClose={closeOsqueryFlyout} />
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
