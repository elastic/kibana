/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiIcon,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiTabbedContent,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiProgress,
  EuiToolTip,
  EuiButtonIcon,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useCallback, useState, useMemo, useEffect } from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';

import { ActionCreator } from 'typescript-fsa';
import { FlyoutHeaderWithCloseButton } from '../flyout/header_with_close_button';
import { BrowserFields, DocValueFields } from '../../../common/containers/source';
import { Direction, TimelineItem } from '../../../../common/search_strategy';
import { useTimelineEvents } from '../../containers/index';
import { useKibana } from '../../../common/lib/kibana';
import { ColumnHeaderOptions, KqlMode } from '../../../timelines/store/timeline/model';
import { defaultHeaders } from './body/column_headers/default_headers';
import { Sort } from './body/sort';
import { StatefulBody } from './body/stateful_body';
import { DataProvider } from './data_providers/data_provider';
import { TimelineKqlFetch } from './fetch_kql_timeline';
import { Footer, footerHeight } from './footer';
import { TimelineHeader } from './header';
import { combineQueries } from './helpers';
import { TimelineRefetch } from './refetch_timeline';
import * as i18n from './translations';
import {
  esQuery,
  Filter,
  FilterManager,
  IIndexPattern,
} from '../../../../../../../src/plugins/data/public';
import { useManageTimeline } from '../manage_timeline';
import {
  TimelineType,
  TimelineStatusLiteral,
  TimelineEventsType,
} from '../../../../common/types/timeline';
import { requiredFieldsForActions } from '../../../detections/components/alerts_table/default_config';
import { ExpandableEvent } from './expandable_event';
import {
  activeTimeline,
  ActiveTimelineExpandedEvent,
} from '../../containers/active_timeline_context';
import { GraphOverlay } from '../graph_overlay';
import { NotesTabContent } from '../notes';
import { SuperDatePicker } from '../../../common/components/super_date_picker';
import { InputsModelId } from '../../../common/store/inputs/constants';
import { EventDetailsWidthProvider } from '../../../common/components/events_viewer/event_details_width_context';
import { PickEventType } from './search_or_filter/pick_events';
import { timelineActions } from '../../store/timeline';
import { sourcererActions } from '../../../common/store/sourcerer';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';

const TimelineContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
`;

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

const TimelineTemplateBadge = styled.div`
  background: ${({ theme }) => theme.eui.euiColorVis3_behindText};
  color: #fff;
  padding: 10px 15px;
  font-size: 0.8em;
`;

export const DatePicker = styled(EuiFlexItem)`
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

export interface Props {
  browserFields: BrowserFields;
  columns: ColumnHeaderOptions[];
  dataProviders: DataProvider[];
  docValueFields: DocValueFields[];
  end: string;
  eventType: TimelineEventsType;
  filters: Filter[];
  graphEventId?: string;
  id: string;
  indexNames: string[];
  indexPattern: IIndexPattern;
  isDatePickerLocked: boolean;
  isLive: boolean;
  isSaving: boolean;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  kqlMode: KqlMode;
  kqlQueryExpression: string;
  loadingSourcerer: boolean;
  noteIds: string[];
  onClose: () => void;
  show: boolean;
  showCallOutUnauthorizedMsg: boolean;
  sort: Sort;
  start: string;
  status: TimelineStatusLiteral;
  timelineType: TimelineType;
  timerangeKind: 'absolute' | 'relative';
  toggleLock: ActionCreator<{ linkToId: InputsModelId }>;
  usersViewing: string[];
}

/** The parent Timeline component */
export const TimelineComponent: React.FC<Props> = ({
  browserFields,
  columns,
  dataProviders,
  docValueFields,
  end,
  eventType,
  filters,
  graphEventId,
  id,
  indexPattern,
  indexNames,
  isDatePickerLocked,
  isLive,
  loadingSourcerer,
  isSaving,
  itemsPerPage,
  itemsPerPageOptions,
  kqlMode,
  kqlQueryExpression,
  noteIds,
  onClose,
  show,
  showCallOutUnauthorizedMsg,
  start,
  status,
  sort,
  timelineType,
  timerangeKind,
  toggleLock,
  usersViewing,
}) => {
  const dispatch = useDispatch();
  const [expanded, setExpanded] = useState<ActiveTimelineExpandedEvent>(
    activeTimeline.getExpandedEvent()
  );

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

  const kibana = useKibana();
  const [filterManager] = useState<FilterManager>(new FilterManager(kibana.services.uiSettings));
  const esQueryConfig = useMemo(() => esQuery.getEsQueryConfig(kibana.services.uiSettings), [
    kibana.services.uiSettings,
  ]);
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
      dispatch(timelineActions.updateEventType({ id, eventType: newEventType }));
      dispatch(timelineActions.updateIndexNames({ id, indexNames: newIndexNames }));
      dispatch(
        sourcererActions.setSelectedIndexPatterns({
          id: SourcererScopeName.timeline,
          selectedPatterns: newIndexNames,
        })
      );
    },
    [dispatch, id]
  );

  const [isQueryLoading, setIsQueryLoading] = useState(false);
  const { initializeTimeline, setIsTimelineLoading } = useManageTimeline();
  useEffect(() => {
    initializeTimeline({
      filterManager,
      id,
    });
  }, [initializeTimeline, filterManager, id]);

  const [
    loading,
    { events, inspect, totalCount, pageInfo, loadPage, updatedAt, refetch },
  ] = useTimelineEvents({
    docValueFields,
    endDate: end,
    id,
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
    setIsTimelineLoading({ id, isLoading: isQueryLoading || loadingSourcerer });
  }, [loadingSourcerer, id, isQueryLoading, setIsTimelineLoading]);

  useEffect(() => {
    setIsQueryLoading(loading);
  }, [loading]);

  const tabs = [
    {
      id: 'cobalt--id',
      name: 'Query',
      content: (
        <>
          <TimelineKqlFetch id={id} indexPattern={indexPattern} inputId="timeline" />
          {/* {canQueryTimeline ? ( */}
          <>
            <TimelineRefetch
              id={id}
              inputId="timeline"
              inspect={inspect}
              loading={loading}
              refetch={refetch}
            />
            {graphEventId && (
              <GraphOverlay
                graphEventId={graphEventId}
                isEventViewer={false}
                timelineId={id}
                timelineType={timelineType}
              />
            )}
            <FullWidthFlexGroup $visible={!graphEventId}>
              <ScrollableFlexItem grow={2}>
                <StyledEuiFlyoutHeader data-test-subj="eui-flyout-header" hasBorder={false}>
                  <EuiFlexGroup gutterSize="s" data-test-subj="timeline-date-picker-container">
                    <DatePicker grow={1}>
                      <SuperDatePicker id="timeline" timelineId={id} />
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
                      <EuiButtonIcon
                        data-test-subj={`timeline-date-picker-${
                          isDatePickerLocked ? 'lock' : 'unlock'
                        }-button`}
                        color="primary"
                        onClick={onToggleLock}
                        iconType={isDatePickerLocked ? 'lock' : 'lockOpen'}
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
                      graphEventId={graphEventId}
                      show={show}
                      showCallOutUnauthorizedMsg={showCallOutUnauthorizedMsg}
                      timelineId={id}
                      status={status}
                    />
                  </TimelineHeaderContainer>
                </StyledEuiFlyoutHeader>
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
                      id={id}
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
                      id={id}
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
              </ScrollableFlexItem>
              <ScrollableFlexItem grow={1}>
                <EuiTitle>
                  <h3>{'Event details'}</h3>
                </EuiTitle>
                <ExpandableEvent
                  browserFields={browserFields}
                  docValueFields={docValueFields}
                  event={expanded}
                  timelineId={id}
                />
              </ScrollableFlexItem>
            </FullWidthFlexGroup>
          </>
          {/* ) : null} */}
        </>
      ),
    },
    {
      id: 'dextrose--id',
      name: 'Notes',
      content: (
        <>
          <EuiSpacer />
          <EuiTitle>
            <h3>{'Notes'}</h3>
          </EuiTitle>
          <NotesTabContent timelineStatus={status} timelineId={id} noteIds={noteIds} />
        </>
      ),
    },
    {
      id: 'hydrogen--id',
      name: (
        <span>
          <EuiIcon type="heatmap" />
          {' Hydrogen'}
        </span>
      ),
      content: (
        <>
          <EuiSpacer />
          <EuiTitle>
            <h3>{'Hydrogen'}</h3>
          </EuiTitle>
          <EuiText>
            {`Hydrogen is a chemical element with symbol H and atomic number 1. With a standard atomic
            weight of 1.008, hydrogen is the lightest element on the periodic table`}
          </EuiText>
        </>
      ),
    },
  ];

  return (
    <TimelineContainer data-test-subj="timeline">
      {isSaving && <EuiProgress size="s" color="primary" position="absolute" />}
      {timelineType === TimelineType.template && (
        <TimelineTemplateBadge>{i18n.TIMELINE_TEMPLATE}</TimelineTemplateBadge>
      )}

      <FlyoutHeaderWithCloseButton onClose={onClose} timelineId={id} usersViewing={usersViewing} />

      <StyledEuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} autoFocus="selected" />
    </TimelineContainer>
  );
};

export const Timeline = React.memo(TimelineComponent);
