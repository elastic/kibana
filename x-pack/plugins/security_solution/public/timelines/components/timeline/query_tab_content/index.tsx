/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiTabbedContent,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiSpacer,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useCallback, useState, useMemo, useEffect } from 'react';
import styled from 'styled-components';
import { connect, ConnectedProps, useDispatch } from 'react-redux';
import deepEqual from 'fast-deep-equal';

import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { Direction } from '../../../../../common/search_strategy';
import { useTimelineEvents } from '../../../containers/index';
import { useKibana } from '../../../../common/lib/kibana';
import { defaultHeaders } from '../body/column_headers/default_headers';
import { StatefulBody } from '../body';
import { TimelineKqlFetch } from '../fetch_kql_timeline';
import { Footer, footerHeight } from '../footer';
import { TimelineHeader } from '../header';
import { combineQueries } from '../helpers';
import { TimelineRefetch } from '../refetch_timeline';
import { esQuery, FilterManager } from '../../../../../../../../src/plugins/data/public';
import { useManageTimeline } from '../../manage_timeline';
import { TimelineEventsType } from '../../../../../common/types/timeline';
import { requiredFieldsForActions } from '../../../../detections/components/alerts_table/default_config';
import { SuperDatePicker } from '../../../../common/components/super_date_picker';
import { EventDetailsWidthProvider } from '../../../../common/components/events_viewer/event_details_width_context';
import { PickEventType } from '../search_or_filter/pick_events';
import { inputsModel, inputsSelectors, State } from '../../../../common/store';
import { sourcererActions } from '../../../../common/store/sourcerer';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { timelineDefaults } from '../../../../timelines/store/timeline/defaults';
import { useSourcererScope } from '../../../../common/containers/sourcerer';
import { TimelineModel } from '../../../../timelines/store/timeline/model';
import { EventDetails } from '../event_details';
import { TimelineDatePickerLock } from '../date_picker_lock';

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

const FullWidthFlexGroup = styled(EuiFlexGroup)`
  width: 100%;
  overflow: hidden;
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

const VerticalRule = styled.div`
  width: 2px;
  height: 100%;
  background: ${({ theme }) => theme.eui.euiColorLightShade};
`;

VerticalRule.displayName = 'VerticalRule';

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

export const QueryTabContentComponent: React.FC<Props> = ({
  columns,
  dataProviders,
  end,
  eventType,
  filters,
  timelineId,
  isLive,
  itemsPerPage,
  itemsPerPageOptions,
  kqlMode,
  kqlQueryExpression,
  show,
  showCallOutUnauthorizedMsg,
  showEventDetails,
  start,
  status,
  sort,
  timelineType,
  timerangeKind,
}) => {
  const dispatch = useDispatch();
  const [showEventDetailsColumn, setShowEventDetailsColumn] = useState(false);

  useEffect(() => {
    setShowEventDetailsColumn((current) => {
      if (showEventDetails && !current) {
        return true;
      }
      return current;
    });
  }, [showEventDetails]);

  const {
    browserFields,
    docValueFields,
    loading: loadingSourcerer,
    indexPattern,
    selectedPatterns: indexNames,
  } = useSourcererScope(SourcererScopeName.timeline);

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

      <TimelineRefetch
        id={timelineId}
        inputId="timeline"
        inspect={inspect}
        loading={loading}
        refetch={refetch}
      />
      <FullWidthFlexGroup>
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
              <EuiSpacer size="s" />
              <TimelineDatePickerLock />
              <EuiSpacer size="s" />
            </div>
            <TimelineHeaderContainer data-test-subj="timelineHeader">
              <TimelineHeader
                browserFields={browserFields}
                indexPattern={indexPattern}
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
                  id={timelineId}
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
        {showEventDetailsColumn && (
          <>
            <VerticalRule />
            <ScrollableFlexItem grow={1}>
              <EventDetails
                browserFields={browserFields}
                docValueFields={docValueFields}
                timelineId={timelineId}
              />
            </ScrollableFlexItem>
          </>
        )}
      </FullWidthFlexGroup>
    </>
  );
};

const makeMapStateToProps = () => {
  const getShowCallOutUnauthorizedMsg = timelineSelectors.getShowCallOutUnauthorizedMsg();
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getKqlQueryTimeline = timelineSelectors.getKqlFilterQuerySelector();
  const getInputsTimeline = inputsSelectors.getTimelineSelector();
  const mapStateToProps = (state: State, { timelineId }: OwnProps) => {
    const timeline: TimelineModel = getTimeline(state, timelineId) ?? timelineDefaults;
    const input: inputsModel.InputsRange = getInputsTimeline(state);
    const {
      columns,
      dataProviders,
      eventType,
      expandedEvent,
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
      showEventDetails: !!expandedEvent.eventId,
      sort,
      start: input.timerange.from,
      status,
      timelineType,
      timerangeKind: input.timerange.kind,
    };
  };
  return mapStateToProps;
};

const connector = connect(makeMapStateToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const QueryTabContent = connector(
  React.memo(
    QueryTabContentComponent,
    (prevProps, nextProps) =>
      isTimerangeSame(prevProps, nextProps) &&
      prevProps.eventType === nextProps.eventType &&
      prevProps.isLive === nextProps.isLive &&
      prevProps.isSaving === nextProps.isSaving &&
      prevProps.isTimelineExists === nextProps.isTimelineExists &&
      prevProps.itemsPerPage === nextProps.itemsPerPage &&
      prevProps.kqlMode === nextProps.kqlMode &&
      prevProps.kqlQueryExpression === nextProps.kqlQueryExpression &&
      prevProps.show === nextProps.show &&
      prevProps.showCallOutUnauthorizedMsg === nextProps.showCallOutUnauthorizedMsg &&
      prevProps.showEventDetails === nextProps.showEventDetails &&
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
