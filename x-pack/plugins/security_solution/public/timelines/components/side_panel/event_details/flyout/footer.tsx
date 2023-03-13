/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFlyoutFooter, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { find } from 'lodash/fp';
import type { ConnectedProps } from 'react-redux';
import { connect } from 'react-redux';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { isActiveTimeline } from '../../../../../helpers';
import { TakeActionDropdown } from '../../../../../detections/components/take_action_dropdown';
import type { TimelineEventsDetailsItem } from '../../../../../../common/search_strategy';
import { useExceptionFlyout } from '../../../../../detections/components/alerts_table/timeline_actions/use_add_exception_flyout';
import { AddExceptionFlyoutWrapper } from '../../../../../detections/components/alerts_table/timeline_actions/alert_context_menu';
import { EventFiltersFlyout } from '../../../../../management/pages/event_filters/view/components/event_filters_flyout';
import { useEventFilterModal } from '../../../../../detections/components/alerts_table/timeline_actions/use_event_filter_modal';
import { getFieldValue } from '../../../../../detections/components/host_isolation/helpers';
import type { Status } from '../../../../../../common/detection_engine/schemas/common/schemas';
import type { inputsModel, State } from '../../../../../common/store';
import { inputsSelectors } from '../../../../../common/store';
import { OsqueryFlyout } from '../../../../../detections/components/osquery/osquery_flyout';
interface FlyoutFooterProps {
  detailsData: TimelineEventsDetailsItem[] | null;
  detailsEcsData: Ecs | null;
  expandedEvent: {
    eventId: string;
    indexName: string;
    refetch?: () => void;
  };
  handleOnEventClosed: () => void;
  isHostIsolationPanelOpen: boolean;
  isReadOnly?: boolean;
  loadingEventDetails: boolean;
  onAddIsolationStatusClick: (action: 'isolateHost' | 'unisolateHost') => void;
  scopeId: string;
  refetchFlyoutData: () => Promise<void>;
}

interface AddExceptionModalWrapperData {
  alertStatus: Status;
  eventId: string;
  ruleId: string;
  ruleRuleId: string;
  ruleName: string;
}

export const FlyoutFooterComponent = React.memo(
  ({
    detailsData,
    detailsEcsData,
    expandedEvent,
    handleOnEventClosed,
    isHostIsolationPanelOpen,
    isReadOnly,
    loadingEventDetails,
    onAddIsolationStatusClick,
    scopeId,
    globalQuery,
    timelineQuery,
    refetchFlyoutData,
  }: FlyoutFooterProps & PropsFromRedux) => {
    const alertId = detailsEcsData?.kibana?.alert ? detailsEcsData?._id : null;
    const ruleIndexRaw = useMemo(
      () =>
        find({ category: 'signal', field: 'signal.rule.index' }, detailsData)?.values ??
        find({ category: 'kibana', field: 'kibana.alert.rule.parameters.index' }, detailsData)
          ?.values,
      [detailsData]
    );
    const ruleIndex = useMemo(
      (): string[] | undefined => (Array.isArray(ruleIndexRaw) ? ruleIndexRaw : undefined),
      [ruleIndexRaw]
    );
    const ruleDataViewIdRaw = useMemo(
      () =>
        find({ category: 'signal', field: 'signal.rule.data_view_id' }, detailsData)?.values ??
        find(
          { category: 'kibana', field: 'kibana.alert.rule.parameters.data_view_id' },
          detailsData
        )?.values,
      [detailsData]
    );
    const ruleDataViewId = useMemo(
      (): string | undefined =>
        Array.isArray(ruleDataViewIdRaw) ? ruleDataViewIdRaw[0] : undefined,
      [ruleDataViewIdRaw]
    );

    const addExceptionModalWrapperData = useMemo(
      () =>
        [
          { category: 'signal', field: 'signal.rule.id', name: 'ruleId' },
          { category: 'signal', field: 'signal.rule.rule_id', name: 'ruleRuleId' },
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
      if (isActiveTimeline(scopeId)) {
        refetchQuery([timelineQuery]);
      } else {
        refetchQuery(globalQuery);
      }
    }, [scopeId, timelineQuery, globalQuery]);

    const {
      exceptionFlyoutType,
      openAddExceptionFlyout,
      onAddExceptionTypeClick,
      onAddExceptionCancel,
      onAddExceptionConfirm,
    } = useExceptionFlyout({
      refetch: refetchAll,
      isActiveTimelines: isActiveTimeline(scopeId),
    });
    const { closeAddEventFilterModal, isAddEventFilterModalOpen, onAddEventFilterClick } =
      useEventFilterModal();

    const [isOsqueryFlyoutOpenWithAgentId, setOsqueryFlyoutOpenWithAgentId] = useState<
      null | string
    >(null);

    const closeOsqueryFlyout = useCallback(() => {
      setOsqueryFlyoutOpenWithAgentId(null);
    }, [setOsqueryFlyoutOpenWithAgentId]);

    if (isReadOnly) {
      return null;
    }

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
                  scopeId={scopeId}
                  onOsqueryClick={setOsqueryFlyoutOpenWithAgentId}
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
        {/* This is still wrong to do render flyout/modal inside of the flyout
        We need to completely refactor the EventDetails  component to be correct
      */}
        {openAddExceptionFlyout &&
          addExceptionModalWrapperData.ruleId != null &&
          addExceptionModalWrapperData.ruleRuleId != null &&
          addExceptionModalWrapperData.eventId != null && (
            <AddExceptionFlyoutWrapper
              {...addExceptionModalWrapperData}
              ruleIndices={ruleIndex}
              ruleDataViewId={ruleDataViewId}
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
          <OsqueryFlyout
            agentId={isOsqueryFlyoutOpenWithAgentId}
            defaultValues={alertId ? { alertIds: [alertId] } : undefined}
            onClose={closeOsqueryFlyout}
            ecsData={detailsEcsData}
          />
        )}
      </>
    );
  }
);

const makeMapStateToProps = () => {
  const getGlobalQueries = inputsSelectors.globalQuery();
  const getTimelineQuery = inputsSelectors.timelineQueryByIdSelector();
  const mapStateToProps = (state: State, { scopeId }: FlyoutFooterProps) => {
    return {
      globalQuery: getGlobalQueries(state),
      timelineQuery: getTimelineQuery(state, scopeId),
    };
  };
  return mapStateToProps;
};

const connector = connect(makeMapStateToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const FlyoutFooter = connector(React.memo(FlyoutFooterComponent));
