/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiTitle,
  EuiTabbedContent,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiToolTip,
  EuiSwitch,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useCallback, useState, useMemo, useEffect } from 'react';
import styled from 'styled-components';
import { connect, ConnectedProps, useDispatch } from 'react-redux';
import deepEqual from 'fast-deep-equal';

import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { Direction, TimelineItem } from '../../../../../common/search_strategy';
import { useTimelineEvents } from '../../../containers/index';
import { useKibana } from '../../../../common/lib/kibana';
import { defaultHeaders } from '../body/column_headers/default_headers';
import { StatefulBody } from '../body/stateful_body';
import { TimelineKqlFetch } from '../fetch_kql_timeline';
import { Footer, footerHeight } from '../footer';
import { TimelineHeader } from '../header';
import { combineQueries } from '../helpers';
import { TimelineRefetch } from '../refetch_timeline';
import * as i18n from '../translations';
import { esQuery, FilterManager } from '../../../../../../../../src/plugins/data/public';
import { useManageTimeline } from '../../manage_timeline';
import { TimelineEventsType } from '../../../../../common/types/timeline';
import { requiredFieldsForActions } from '../../../../detections/components/alerts_table/default_config';
import { ExpandableEvent } from '../expandable_event';
import {
  activeTimeline,
  ActiveTimelineExpandedEvent,
} from '../../../containers/active_timeline_context';
import { GraphOverlay } from '../../graph_overlay';
import { SuperDatePicker } from '../../../../common/components/super_date_picker';
import { EventDetailsWidthProvider } from '../../../../common/components/events_viewer/event_details_width_context';
import { PickEventType } from '../search_or_filter/pick_events';
import { inputsModel, inputsSelectors, State } from '../../../../common/store';
import { sourcererActions } from '../../../../common/store/sourcerer';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { inputsActions } from '../../../../common/store/inputs';
import { timelineDefaults } from '../../../../timelines/store/timeline/defaults';
import { useSourcererScope } from '../../../../common/containers/sourcerer';
import { TimelineModel } from '../../../../timelines/store/timeline/model';

const TimelineHeaderContainer = styled.div`
  margin-top: 6px;
  width: 100%;
`;

TimelineHeaderContainer.displayName = 'TimelineHeaderContainer';

const StyledEuiFlyoutHeader = styled(EuiFlyoutHeader)`
  align-items: stretch;
  box-shadow: none;
  display: flex;
  flex-direction: column;
  padding: 14px 10px 0 12px;
`;

const StyledEuiFlyoutBody = styled(EuiFlyoutBody)`
  overflow-y: hidden;
  flex: 1;

  .euiFlyoutBody__overflow {
    overflow: hidden;
    mask-image: none;
  }

  .euiFlyoutBody__overflowContent {
    padding: 0 10px 0 12px;
    height: 100%;
    display: flex;
  }
`;

const StyledEuiFlyoutFooter = styled(EuiFlyoutFooter)`
  background: none;
  padding: 0 10px 5px 12px;
`;

const FullWidthFlexGroup = styled(EuiFlexGroup)<{ $visible: boolean }>`
  width: 100%;
  overflow: hidden;
  display: ${({ $visible }) => ($visible ? 'flex' : 'none')};
`;

const ScrollableFlexItem = styled(EuiFlexItem)`
  overflow: auto;
`;

const DatePicker = styled(EuiFlexItem)`
  .euiSuperDatePicker__flexWrapper {
    max-width: none;
    width: auto;
  }
`;

DatePicker.displayName = 'DatePicker';

const StyledEuiTabbedContent = styled(EuiTabbedContent)`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;

  > [role='tabpanel'] {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }
`;

StyledEuiTabbedContent.displayName = 'StyledEuiTabbedContent';

const isTimerangeSame = (prevProps: Props, nextProps: Props) =>
  prevProps.end === nextProps.end &&
  prevProps.start === nextProps.start &&
  prevProps.timerangeKind === nextProps.timerangeKind;

interface OwnProps {
  timelineId: string;
}

export type Props = OwnProps & PropsFromRedux;

export const TimelineQueryTabContentComponent: React.FC<Props> = ({
  columns,
  dataProviders,
  end,
  eventType,
  filters,
  graphEventId,
  timelineId,
  isDatePickerLocked,
  isLive,
  itemsPerPage,
  itemsPerPageOptions,
  kqlMode,
  kqlQueryExpression,
  show,
  showCallOutUnauthorizedMsg,
  start,
  status,
  sort,
  timelineType,
  timerangeKind,
  toggleLock,
}) => {
  const dispatch = useDispatch();
  const [expanded, setExpanded] = useState<ActiveTimelineExpandedEvent>(
    activeTimeline.getExpandedEvent()
  );

  const {
    browserFields,
    docValueFields,
    loading: loadingSourcerer,
    indexPattern,
    selectedPatterns: indexNames,
  } = useSourcererScope(SourcererScopeName.timeline);

  const onToggleLock = useCallback(() => toggleLock({ linkToId: 'timeline' }), [toggleLock]);

  const onEventToggled = useCallback((event: TimelineItem) => {
    const eventId = event._id;

    setExpanded((currentExpanded) => {
      if (currentExpanded.eventId === eventId) {
        return {};
      }

      return { eventId, indexName: event._index! };
    });
    activeTimeline.toggleExpandedEvent({ eventId, indexName: event._index! });
  }, []);

  const { uiSettings } = useKibana().services;
  const [filterManager] = useState<FilterManager>(new FilterManager(uiSettings));
  const esQueryConfig = useMemo(() => esQuery.getEsQueryConfig(uiSettings), [uiSettings]);
  const kqlQuery = useMemo(() => ({ query: kqlQueryExpression, language: 'kuery' }), [
    kqlQueryExpression,
  ]);
  const combinedQueries = useMemo(
    () =>
      combineQueries({
        config: esQueryConfig,
        dataProviders,
        indexPattern,
        browserFields,
        filters,
        kqlQuery,
        kqlMode,
      }),
    [browserFields, dataProviders, esQueryConfig, filters, indexPattern, kqlMode, kqlQuery]
  );

  const canQueryTimeline = useMemo(
    () =>
      combinedQueries != null &&
      loadingSourcerer != null &&
      !loadingSourcerer &&
      !isEmpty(start) &&
      !isEmpty(end),
    [loadingSourcerer, combinedQueries, start, end]
  );

  const columnsHeader = isEmpty(columns) ? defaultHeaders : columns;
  const timelineQueryFields = useMemo(() => {
    const columnFields = columnsHeader.map((c) => c.id);
    return [...columnFields, ...requiredFieldsForActions];
  }, [columnsHeader]);
  const timelineQuerySortField = useMemo(
    () => ({
      field: sort.columnId,
      direction: sort.sortDirection as Direction,
    }),
    [sort.columnId, sort.sortDirection]
  );

  const handleUpdateEventTypeAndIndexesName = useCallback(
    (newEventType: TimelineEventsType, newIndexNames: string[]) => {
      dispatch(timelineActions.updateEventType({ id: timelineId, eventType: newEventType }));
      dispatch(timelineActions.updateIndexNames({ id: timelineId, indexNames: newIndexNames }));
      dispatch(
        sourcererActions.setSelectedIndexPatterns({
          id: SourcererScopeName.timeline,
          selectedPatterns: newIndexNames,
        })
      );
    },
    [dispatch, timelineId]
  );

  const [isQueryLoading, setIsQueryLoading] = useState(false);
  const { initializeTimeline, setIsTimelineLoading } = useManageTimeline();
  useEffect(() => {
    initializeTimeline({
      filterManager,
      id: timelineId,
    });
  }, [initializeTimeline, filterManager, timelineId]);

  const [
    loading,
    { events, inspect, totalCount, pageInfo, loadPage, updatedAt, refetch },
  ] = useTimelineEvents({
    docValueFields,
    endDate: end,
    id: timelineId,
    indexNames,
    fields: timelineQueryFields,
    limit: itemsPerPage,
    filterQuery: combinedQueries?.filterQuery ?? '',
    startDate: start,
    skip: !canQueryTimeline,
    sort: timelineQuerySortField,
    timerangeKind,
  });

  useEffect(() => {
    setIsTimelineLoading({ id: timelineId, isLoading: isQueryLoading || loadingSourcerer });
  }, [loadingSourcerer, timelineId, isQueryLoading, setIsTimelineLoading]);

  useEffect(() => {
    setIsQueryLoading(loading);
  }, [loading]);

  return (
    <>
      <TimelineKqlFetch id={timelineId} indexPattern={indexPattern} inputId="timeline" />

      <>
        <TimelineRefetch
          id={timelineId}
          inputId="timeline"
          inspect={inspect}
          loading={loading}
          refetch={refetch}
        />
        {graphEventId && (
          <GraphOverlay
            graphEventId={graphEventId}
            isEventViewer={false}
            timelineId={timelineId}
            timelineType={timelineType}
          />
        )}
        <FullWidthFlexGroup $visible={!graphEventId}>
          <ScrollableFlexItem grow={2}>
            <StyledEuiFlyoutHeader data-test-subj="eui-flyout-header" hasBorder={false}>
              <EuiFlexGroup gutterSize="s" data-test-subj="timeline-date-picker-container">
                <DatePicker grow={1}>
                  <SuperDatePicker id="timeline" timelineId={timelineId} />
                </DatePicker>
                <EuiFlexItem grow={false}>
                  <PickEventType
                    eventType={eventType}
                    onChangeEventTypeAndIndexesName={handleUpdateEventTypeAndIndexesName}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
              <div>
                <EuiToolTip
                  data-test-subj="timeline-date-picker-lock-tooltip"
                  position="top"
                  content={
                    isDatePickerLocked
                      ? i18n.LOCK_SYNC_MAIN_DATE_PICKER_TOOL_TIP
                      : i18n.UNLOCK_SYNC_MAIN_DATE_PICKER_TOOL_TIP
                  }
                >
                  <EuiSwitch
                    data-test-subj={`timeline-date-picker-${
                      isDatePickerLocked ? 'lock' : 'unlock'
                    }-button`}
                    label={
                      isDatePickerLocked
                        ? i18n.LOCK_SYNC_MAIN_DATE_PICKER_LABEL
                        : i18n.UNLOCK_SYNC_MAIN_DATE_PICKER_LABEL
                    }
                    checked={isDatePickerLocked}
                    onChange={onToggleLock}
                    compressed
                    aria-label={
                      isDatePickerLocked
                        ? i18n.UNLOCK_SYNC_MAIN_DATE_PICKER_ARIA
                        : i18n.LOCK_SYNC_MAIN_DATE_PICKER_ARIA
                    }
                  />
                </EuiToolTip>
              </div>
              <TimelineHeaderContainer data-test-subj="timelineHeader">
                <TimelineHeader
                  browserFields={browserFields}
                  indexPattern={indexPattern}
                  dataProviders={dataProviders}
                  filterManager={filterManager}
                  show={show}
                  showCallOutUnauthorizedMsg={showCallOutUnauthorizedMsg}
                  timelineId={timelineId}
                  status={status}
                />
              </TimelineHeaderContainer>
            </StyledEuiFlyoutHeader>
            {canQueryTimeline ? (
              <EventDetailsWidthProvider>
                <StyledEuiFlyoutBody
                  data-test-subj="eui-flyout-body"
                  className="timeline-flyout-body"
                >
                  <StatefulBody
                    browserFields={browserFields}
                    data={events}
                    docValueFields={docValueFields}
                    expanded={expanded}
                    id={timelineId}
                    onEventToggled={onEventToggled}
                    refetch={refetch}
                    sort={sort}
                  />
                </StyledEuiFlyoutBody>
                <StyledEuiFlyoutFooter
                  data-test-subj="eui-flyout-footer"
                  className="timeline-flyout-footer"
                >
                  <Footer
                    activePage={pageInfo.activePage}
                    data-test-subj="timeline-footer"
                    updatedAt={updatedAt}
                    height={footerHeight}
                    id={timelineId}
                    isLive={isLive}
                    isLoading={loading || loadingSourcerer}
                    itemsCount={events.length}
                    itemsPerPage={itemsPerPage}
                    itemsPerPageOptions={itemsPerPageOptions}
                    onChangePage={loadPage}
                    totalCount={totalCount}
                  />
                </StyledEuiFlyoutFooter>
              </EventDetailsWidthProvider>
            ) : null}
          </ScrollableFlexItem>
          <ScrollableFlexItem grow={1}>
            <EuiTitle>
              <h3>{'Event details'}</h3>
            </EuiTitle>
            <ExpandableEvent
              browserFields={browserFields}
              docValueFields={docValueFields}
              event={expanded}
              timelineId={timelineId}
            />
          </ScrollableFlexItem>
        </FullWidthFlexGroup>
      </>
    </>
  );
};

const makeMapStateToProps = () => {
  const getShowCallOutUnauthorizedMsg = timelineSelectors.getShowCallOutUnauthorizedMsg();
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getKqlQueryTimeline = timelineSelectors.getKqlFilterQuerySelector();
  const getInputsTimeline = inputsSelectors.getTimelineSelector();
  const getGlobalInput = inputsSelectors.globalSelector();
  const mapStateToProps = (state: State, { timelineId }: OwnProps) => {
    const timeline: TimelineModel = getTimeline(state, timelineId) ?? timelineDefaults;
    const input: inputsModel.InputsRange = getInputsTimeline(state);
    const globalInput: inputsModel.InputsRange = getGlobalInput(state);
    const {
      columns,
      dataProviders,
      eventType,
      filters,
      graphEventId,
      itemsPerPage,
      itemsPerPageOptions,
      isSaving,
      kqlMode,
      noteIds,
      show,
      sort,
      status,
      timelineType,
    } = timeline;
    const kqlQueryTimeline = getKqlQueryTimeline(state, timelineId)!;
    const timelineFilter = kqlMode === 'filter' ? filters || [] : [];

    // return events on empty search
    const kqlQueryExpression =
      isEmpty(dataProviders) && isEmpty(kqlQueryTimeline) && timelineType === 'template'
        ? ' '
        : kqlQueryTimeline;
    return {
      columns,
      dataProviders,
      eventType: eventType ?? 'raw',
      end: input.timerange.to,
      filters: timelineFilter,
      graphEventId,
      timelineId,
      isDatePickerLocked: globalInput.linkTo.includes('timeline'),
      isLive: input.policy.kind === 'interval',
      isSaving,
      isTimelineExists: getTimeline(state, timelineId) != null,
      itemsPerPage,
      itemsPerPageOptions,
      kqlMode,
      kqlQueryExpression,
      noteIds,
      show,
      showCallOutUnauthorizedMsg: getShowCallOutUnauthorizedMsg(state),
      sort,
      start: input.timerange.from,
      status,
      timelineType,
      timerangeKind: input.timerange.kind,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = {
  toggleLock: inputsActions.toggleTimelineLinkTo,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const TimelineQueryTabContent = connector(
  React.memo(
    TimelineQueryTabContentComponent,
    // eslint-disable-next-line complexity
    (prevProps, nextProps) =>
      isTimerangeSame(prevProps, nextProps) &&
      prevProps.eventType === nextProps.eventType &&
      prevProps.graphEventId === nextProps.graphEventId &&
      prevProps.isDatePickerLocked === nextProps.isDatePickerLocked &&
      prevProps.isLive === nextProps.isLive &&
      prevProps.isSaving === nextProps.isSaving &&
      prevProps.isTimelineExists === nextProps.isTimelineExists &&
      prevProps.itemsPerPage === nextProps.itemsPerPage &&
      prevProps.kqlMode === nextProps.kqlMode &&
      prevProps.kqlQueryExpression === nextProps.kqlQueryExpression &&
      prevProps.show === nextProps.show &&
      prevProps.showCallOutUnauthorizedMsg === nextProps.showCallOutUnauthorizedMsg &&
      prevProps.timelineId === nextProps.timelineId &&
      prevProps.timelineType === nextProps.timelineType &&
      prevProps.status === nextProps.status &&
      deepEqual(prevProps.noteIds, nextProps.noteIds) &&
      deepEqual(prevProps.columns, nextProps.columns) &&
      deepEqual(prevProps.dataProviders, nextProps.dataProviders) &&
      deepEqual(prevProps.filters, nextProps.filters) &&
      deepEqual(prevProps.itemsPerPageOptions, nextProps.itemsPerPageOptions) &&
      deepEqual(prevProps.sort, nextProps.sort)
  )
);
