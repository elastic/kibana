/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo } from 'react';
import type { Dispatch } from 'redux';
import type { ConnectedProps } from 'react-redux';
import { connect, useDispatch } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import { InPortal } from 'react-reverse-portal';
import type { EuiDataGridControlColumn } from '@elastic/eui';

import { DataLoadingState } from '@kbn/unified-data-table';
import { InputsModelId } from '../../../../../common/store/inputs/constants';
import type { ControlColumnProps } from '../../../../../../common/types';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { timelineActions, timelineSelectors } from '../../../../store';
import { useTimelineEvents } from '../../../../containers';
import { StatefulBody } from '../../body';
import { Footer, footerHeight } from '../../footer';
import { calculateTotalPages } from '../../helpers';
import { TimelineRefetch } from '../../refetch_timeline';
import type { ToggleDetailPanel } from '../../../../../../common/types/timeline';
import { TimelineId, TimelineTabs } from '../../../../../../common/types/timeline';
import { EventDetailsWidthProvider } from '../../../../../common/components/events_viewer/event_details_width_context';
import type { inputsModel, State } from '../../../../../common/store';
import { inputsSelectors } from '../../../../../common/store';
import { SourcererScopeName } from '../../../../../sourcerer/store/model';
import { timelineDefaults } from '../../../../store/defaults';
import { useSourcererDataView } from '../../../../../sourcerer/containers';
import { useEqlEventsCountPortal } from '../../../../../common/hooks/use_timeline_events_count';
import type { TimelineModel } from '../../../../store/model';
import { useTimelineFullScreen } from '../../../../../common/containers/use_full_screen';
import { DetailsPanel } from '../../../side_panel';
import {
  EventsCountBadge,
  FullWidthFlexGroup,
  ScrollableFlexItem,
  StyledEuiFlyoutBody,
  StyledEuiFlyoutFooter,
  VerticalRule,
} from '../shared/layout';
import {
  TIMELINE_EMPTY_EVENTS,
  isTimerangeSame,
  timelineEmptyTrailingControlColumns,
  TIMELINE_NO_SORTING,
} from '../shared/utils';
import type { TimelineTabCommonProps } from '../shared/types';
import { UnifiedTimelineBody } from '../../body/unified_timeline_body';
import { EqlTabHeader } from './header';
import { useTimelineColumns } from '../shared/use_timeline_columns';
import { useTimelineControlColumn } from '../shared/use_timeline_control_columns';

export type Props = TimelineTabCommonProps & PropsFromRedux;

export const EqlTabContentComponent: React.FC<Props> = ({
  activeTab,
  columns,
  end,
  eqlOptions,
  expandedDetail,
  timelineId,
  isLive,
  itemsPerPage,
  itemsPerPageOptions,
  onEventClosed,
  renderCellValue,
  rowRenderers,
  showExpandedDetails,
  start,
  timerangeKind,
  pinnedEventIds,
  eventIdToNoteIds,
}) => {
  const dispatch = useDispatch();
  const { query: eqlQuery = '', ...restEqlOption } = eqlOptions;
  const { portalNode: eqlEventsCountPortalNode } = useEqlEventsCountPortal();
  const { setTimelineFullScreen, timelineFullScreen } = useTimelineFullScreen();
  const {
    browserFields,
    dataViewId,
    loading: loadingSourcerer,
    runtimeMappings,
    selectedPatterns,
  } = useSourcererDataView(SourcererScopeName.timeline);
  const { augmentedColumnHeaders, timelineQueryFieldsFromColumns } = useTimelineColumns(columns);

  const leadingControlColumns = useTimelineControlColumn(columns, TIMELINE_NO_SORTING);

  const unifiedComponentsInTimelineEnabled = useIsExperimentalFeatureEnabled(
    'unifiedComponentsInTimelineEnabled'
  );

  const getManageTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);

  const currentTimeline = useDeepEqualSelector((state) =>
    getManageTimeline(state, timelineId ?? TimelineId.active)
  );

  const { sampleSize } = currentTimeline;

  const isBlankTimeline: boolean = isEmpty(eqlQuery);

  const canQueryTimeline = useCallback(
    () =>
      loadingSourcerer != null &&
      !loadingSourcerer &&
      !isEmpty(start) &&
      !isEmpty(end) &&
      !isBlankTimeline,
    [end, isBlankTimeline, loadingSourcerer, start]
  );

  const [
    dataLoadingState,
    { events, inspect, totalCount, pageInfo, loadPage, refreshedAt, refetch },
  ] = useTimelineEvents({
    dataViewId,
    endDate: end,
    eqlOptions: restEqlOption,
    fields: timelineQueryFieldsFromColumns,
    filterQuery: eqlQuery ?? '',
    id: timelineId,
    indexNames: selectedPatterns,
    language: 'eql',
    limit: unifiedComponentsInTimelineEnabled ? sampleSize : itemsPerPage,
    runtimeMappings,
    skip: !canQueryTimeline(),
    startDate: start,
    timerangeKind,
  });

  const isQueryLoading = useMemo(
    () =>
      dataLoadingState === DataLoadingState.loading ||
      dataLoadingState === DataLoadingState.loadingMore,
    [dataLoadingState]
  );

  const handleOnPanelClosed = useCallback(() => {
    onEventClosed({ tabType: TimelineTabs.eql, id: timelineId });
  }, [onEventClosed, timelineId]);

  useEffect(() => {
    dispatch(
      timelineActions.updateIsLoading({
        id: timelineId,
        isLoading: isQueryLoading || loadingSourcerer,
      })
    );
  }, [loadingSourcerer, timelineId, isQueryLoading, dispatch]);

  const unifiedHeader = useMemo(
    () => (
      <EuiFlexGroup gutterSize="s" direction="column">
        <EqlTabHeader
          activeTab={activeTab}
          setTimelineFullScreen={setTimelineFullScreen}
          timelineFullScreen={timelineFullScreen}
          timelineId={timelineId}
        />
      </EuiFlexGroup>
    ),
    [activeTab, setTimelineFullScreen, timelineFullScreen, timelineId]
  );

  return (
    <>
      {unifiedComponentsInTimelineEnabled ? (
        <>
          <InPortal node={eqlEventsCountPortalNode}>
            {totalCount >= 0 ? <EventsCountBadge>{totalCount}</EventsCountBadge> : null}
          </InPortal>
          <FullWidthFlexGroup>
            <ScrollableFlexItem grow={2}>
              <UnifiedTimelineBody
                header={unifiedHeader}
                columns={augmentedColumnHeaders}
                isSortEnabled={false}
                rowRenderers={rowRenderers}
                timelineId={timelineId}
                itemsPerPage={itemsPerPage}
                itemsPerPageOptions={itemsPerPageOptions}
                sort={TIMELINE_NO_SORTING}
                events={events}
                refetch={refetch}
                dataLoadingState={dataLoadingState}
                totalCount={isBlankTimeline ? 0 : totalCount}
                onEventClosed={onEventClosed}
                expandedDetail={expandedDetail}
                showExpandedDetails={showExpandedDetails}
                onChangePage={loadPage}
                activeTab={activeTab}
                updatedAt={refreshedAt}
                isTextBasedQuery={false}
                pageInfo={pageInfo}
                leadingControlColumns={leadingControlColumns as EuiDataGridControlColumn[]}
                pinnedEventIds={pinnedEventIds}
                eventIdToNoteIds={eventIdToNoteIds}
              />
            </ScrollableFlexItem>
          </FullWidthFlexGroup>
        </>
      ) : (
        <>
          <InPortal node={eqlEventsCountPortalNode}>
            {totalCount >= 0 ? <EventsCountBadge>{totalCount}</EventsCountBadge> : null}
          </InPortal>
          <TimelineRefetch
            id={`${timelineId}-${TimelineTabs.eql}`}
            inputId={InputsModelId.timeline}
            inspect={inspect}
            loading={isQueryLoading}
            refetch={refetch}
          />
          <FullWidthFlexGroup>
            <ScrollableFlexItem grow={2}>
              <EqlTabHeader
                activeTab={activeTab}
                setTimelineFullScreen={setTimelineFullScreen}
                timelineFullScreen={timelineFullScreen}
                timelineId={timelineId}
              />
              <EventDetailsWidthProvider>
                <StyledEuiFlyoutBody
                  data-test-subj={`${TimelineTabs.eql}-tab-flyout-body`}
                  className="timeline-flyout-body"
                >
                  <StatefulBody
                    activePage={pageInfo.activePage}
                    browserFields={browserFields}
                    data={isBlankTimeline ? TIMELINE_EMPTY_EVENTS : events}
                    id={timelineId}
                    refetch={refetch}
                    renderCellValue={renderCellValue}
                    rowRenderers={rowRenderers}
                    sort={TIMELINE_NO_SORTING}
                    tabType={TimelineTabs.eql}
                    totalPages={calculateTotalPages({
                      itemsCount: totalCount,
                      itemsPerPage,
                    })}
                    leadingControlColumns={leadingControlColumns as ControlColumnProps[]}
                    trailingControlColumns={timelineEmptyTrailingControlColumns}
                  />
                </StyledEuiFlyoutBody>

                <StyledEuiFlyoutFooter
                  data-test-subj={`${TimelineTabs.eql}-tab-flyout-footer`}
                  className="timeline-flyout-footer"
                >
                  {!isBlankTimeline && (
                    <Footer
                      activePage={pageInfo?.activePage ?? 0}
                      data-test-subj="timeline-footer"
                      updatedAt={refreshedAt}
                      height={footerHeight}
                      id={timelineId}
                      isLive={isLive}
                      isLoading={isQueryLoading || loadingSourcerer}
                      itemsCount={isBlankTimeline ? 0 : events.length}
                      itemsPerPage={itemsPerPage}
                      itemsPerPageOptions={itemsPerPageOptions}
                      onChangePage={loadPage}
                      totalCount={isBlankTimeline ? 0 : totalCount}
                    />
                  )}
                </StyledEuiFlyoutFooter>
              </EventDetailsWidthProvider>
            </ScrollableFlexItem>
            {showExpandedDetails && (
              <>
                <VerticalRule />
                <ScrollableFlexItem grow={1}>
                  <DetailsPanel
                    browserFields={browserFields}
                    runtimeMappings={runtimeMappings}
                    tabType={TimelineTabs.eql}
                    scopeId={timelineId}
                    handleOnPanelClosed={handleOnPanelClosed}
                  />
                </ScrollableFlexItem>
              </>
            )}
          </FullWidthFlexGroup>
        </>
      )}
    </>
  );
};

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getInputsTimeline = inputsSelectors.getTimelineSelector();
  const mapStateToProps = (state: State, { timelineId }: TimelineTabCommonProps) => {
    const timeline: TimelineModel = getTimeline(state, timelineId) ?? timelineDefaults;
    const input: inputsModel.InputsRange = getInputsTimeline(state);
    const {
      activeTab,
      columns,
      eqlOptions,
      expandedDetail,
      itemsPerPage,
      itemsPerPageOptions,
      pinnedEventIds,
      eventIdToNoteIds,
    } = timeline;

    return {
      activeTab,
      columns,
      eqlOptions,
      end: input.timerange.to,
      expandedDetail,
      timelineId,
      isLive: input.policy.kind === 'interval',
      itemsPerPage,
      itemsPerPageOptions,
      pinnedEventIds,
      eventIdToNoteIds,
      showExpandedDetails:
        !!expandedDetail[TimelineTabs.eql] && !!expandedDetail[TimelineTabs.eql]?.panelView,

      start: input.timerange.from,
      timerangeKind: input.timerange.kind,
    };
  };
  return mapStateToProps;
};
const mapDispatchToProps = (dispatch: Dispatch) => ({
  onEventClosed: (args: ToggleDetailPanel) => {
    dispatch(timelineActions.toggleDetailPanel(args));
  },
});

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

const EqlTabContent = connector(
  React.memo(
    EqlTabContentComponent,
    (prevProps, nextProps) =>
      prevProps.activeTab === nextProps.activeTab &&
      isTimerangeSame(prevProps, nextProps) &&
      deepEqual(prevProps.eqlOptions, nextProps.eqlOptions) &&
      prevProps.isLive === nextProps.isLive &&
      prevProps.itemsPerPage === nextProps.itemsPerPage &&
      prevProps.onEventClosed === nextProps.onEventClosed &&
      prevProps.showExpandedDetails === nextProps.showExpandedDetails &&
      prevProps.timelineId === nextProps.timelineId &&
      deepEqual(prevProps.columns, nextProps.columns) &&
      deepEqual(prevProps.pinnedEventIds, nextProps.pinnedEventIds) &&
      deepEqual(prevProps.eventIdToNoteIds, nextProps.eventIdToNoteIds) &&
      deepEqual(prevProps.itemsPerPageOptions, nextProps.itemsPerPageOptions)
  )
);

// eslint-disable-next-line import/no-default-export
export { EqlTabContent as default };
