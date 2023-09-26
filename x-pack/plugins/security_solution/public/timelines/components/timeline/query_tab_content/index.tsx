/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiFlyoutHeader, EuiBadge } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useMemo, useEffect, useCallback, useState } from 'react';
import styled from 'styled-components';
import type { Dispatch } from 'redux';
import type { ConnectedProps } from 'react-redux';
import { connect, useDispatch } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import { InPortal } from 'react-reverse-portal';

import { FilterManager } from '@kbn/data-plugin/public';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { DataLoadingState } from '@kbn/unified-data-table';
import { RootDragDropProvider } from '@kbn/dom-drag-drop';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { useInvalidFilterQuery } from '../../../../common/hooks/use_invalid_filter_query';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import type { Direction, TimelineItem } from '../../../../../common/search_strategy';
import { useTimelineEvents } from '../../../containers';
import { useKibana } from '../../../../common/lib/kibana';
import { defaultHeaders } from '../body/column_headers/default_headers';
import { TimelineHeader } from '../header';
import { combineQueries } from '../../../../common/lib/kuery';
import { TimelineRefetch } from '../refetch_timeline';
import type {
  KueryFilterQueryKind,
  RowRenderer,
  ToggleDetailPanel,
} from '../../../../../common/types/timeline';
import { TimelineId, TimelineTabs } from '../../../../../common/types/timeline';
import { requiredFieldsForActions } from '../../../../detections/components/alerts_table/default_config';
import { SuperDatePicker } from '../../../../common/components/super_date_picker';
import { EventDetailsWidthProvider } from '../../../../common/components/events_viewer/event_details_width_context';
import type { inputsModel, State } from '../../../../common/store';
import { inputsSelectors } from '../../../../common/store';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { timelineDefaults } from '../../../store/timeline/defaults';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { useTimelineEventsCountPortal } from '../../../../common/hooks/use_timeline_events_count';
import type { TimelineModel } from '../../../store/timeline/model';
import { TimelineDatePickerLock } from '../date_picker_lock';
import { useTimelineFullScreen } from '../../../../common/containers/use_full_screen';
import { activeTimeline } from '../../../containers/active_timeline_context';
import { DetailsPanel } from '../../side_panel';
import { ExitFullScreen } from '../../../../common/components/exit_full_screen';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { Sourcerer } from '../../../../common/components/sourcerer';
import { SAMPLE_SIZE_SETTING, TimelineDataTable } from '../data_table';

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

  &.euiFlyoutHeader {
    ${({ theme }) =>
      `padding: ${theme.eui.euiSizeM} ${theme.eui.euiSizeS} 0 ${theme.eui.euiSizeS};`}
  }
`;

const FullWidthFlexGroup = styled(EuiFlexGroup)`
  margin: 0;
  width: 100%;
  overflow: hidden;
`;

const ScrollableFlexItem = styled(EuiFlexItem)`
  ${({ theme }) => `margin: 0 ${theme.eui.euiSizeM};`}
  overflow: hidden;
  width: 100%;
  padding: 10px 15px 0px 15px;
`;

const SourcererFlex = styled(EuiFlexItem)`
  align-items: flex-end;
`;

SourcererFlex.displayName = 'SourcererFlex';

const VerticalRule = styled.div`
  width: 2px;
  height: 100%;
  background: ${({ theme }) => theme.eui.euiColorLightShade};
`;

VerticalRule.displayName = 'VerticalRule';

const EventsCountBadge = styled(EuiBadge)`
  margin-left: ${({ theme }) => theme.eui.euiSizeS};
`;

const isTimerangeSame = (prevProps: Props, nextProps: Props) =>
  prevProps.end === nextProps.end &&
  prevProps.start === nextProps.start &&
  prevProps.timerangeKind === nextProps.timerangeKind;

const compareQueryProps = (prevProps: Props, nextProps: Props) =>
  prevProps.kqlMode === nextProps.kqlMode &&
  prevProps.kqlQueryExpression === nextProps.kqlQueryExpression &&
  deepEqual(prevProps.filters, nextProps.filters);

interface OwnProps {
  rowRenderers: RowRenderer[];
  timelineId: string;
}

export type Props = OwnProps & PropsFromRedux;

export const QueryTabContentComponent: React.FC<Props> = ({
  activeTab,
  columns,
  dataProviders,
  end,
  expandedDetail,
  filters,
  timelineId,
  isLive,
  itemsPerPage,
  itemsPerPageOptions,
  kqlMode,
  kqlQueryExpression,
  kqlQueryLanguage,
  onEventClosed,
  rowRenderers,
  show,
  showCallOutUnauthorizedMsg,
  showExpandedDetails,
  start,
  status,
  sort,
  timerangeKind,
}) => {
  const dispatch = useDispatch();

  const { timelineFullScreen, setTimelineFullScreen } = useTimelineFullScreen();
  const [pageRows, setPageRows] = useState<TimelineItem[][]>([]);
  const rows = useMemo(() => pageRows.flat(), [pageRows]);
  const { portalNode: timelineEventsCountPortalNode } = useTimelineEventsCountPortal();
  const {
    browserFields,
    dataViewId,
    loading: isSourcererLoading,
    indexPattern,
    runtimeMappings,
    // important to get selectedPatterns from useSourcererDataView
    // in order to include the exclude filters in the search that are not stored in the timeline
    selectedPatterns,
  } = useSourcererDataView(SourcererScopeName.timeline);

  const {
    services: { uiSettings },
  } = useKibana();

  const getManageTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const currentTimeline = useDeepEqualSelector((state) =>
    getManageTimeline(state, timelineId ?? TimelineId.active)
  );

  const activeFilterManager = currentTimeline.filterManager;
  const filterManager = useMemo(
    () => activeFilterManager ?? new FilterManager(uiSettings),
    [activeFilterManager, uiSettings]
  );

  const esQueryConfig = useMemo(() => getEsQueryConfig(uiSettings), [uiSettings]);
  const kqlQuery: {
    query: string;
    language: KueryFilterQueryKind;
  } = useMemo(
    () => ({ query: kqlQueryExpression.trim(), language: kqlQueryLanguage }),
    [kqlQueryExpression, kqlQueryLanguage]
  );

  const combinedQueries = combineQueries({
    config: esQueryConfig,
    dataProviders,
    indexPattern,
    browserFields,
    filters,
    kqlQuery,
    kqlMode,
  });

  useInvalidFilterQuery({
    id: timelineId,
    filterQuery: combinedQueries?.filterQuery,
    kqlError: combinedQueries?.kqlError,
    query: kqlQuery,
    startDate: start,
    endDate: end,
  });

  const canQueryTimeline = useMemo(
    () =>
      combinedQueries != null &&
      isSourcererLoading != null &&
      !isSourcererLoading &&
      !isEmpty(start) &&
      !isEmpty(end) &&
      combinedQueries?.filterQuery !== undefined,
    [combinedQueries, end, isSourcererLoading, start]
  );

  const columnsHeader = useMemo(() => {
    return isEmpty(columns) ? defaultHeaders : columns;
  }, [columns]);

  const defaultColumns = useMemo(() => {
    return columnsHeader.map((c) => c.id);
  }, [columnsHeader]);

  const getTimelineQueryFields = useCallback(() => {
    return [...defaultColumns, ...requiredFieldsForActions];
  }, [defaultColumns]);

  const timelineQuerySortField = sort.map(({ columnId, columnType, esTypes, sortDirection }) => ({
    field: columnId,
    direction: sortDirection as Direction,
    esTypes: esTypes ?? [],
    type: columnType,
  }));

  useEffect(() => {
    dispatch(
      timelineActions.initializeTimelineSettings({
        filterManager,
        id: timelineId,
      })
    );
  }, [dispatch, filterManager, timelineId]);

  const [
    dataLoadingState,
    { events, inspect, totalCount, refetch, loadPage, pageInfo, updatedAt },
  ] = useTimelineEvents({
    dataViewId,
    endDate: end,
    fields: getTimelineQueryFields(),
    filterQuery: combinedQueries?.filterQuery,
    id: timelineId,
    indexNames: selectedPatterns,
    language: kqlQuery.language,
    limit: SAMPLE_SIZE_SETTING,
    runtimeMappings,
    skip: !canQueryTimeline,
    sort: timelineQuerySortField,
    startDate: start,
    timerangeKind,
  });

  const isQueryLoading = useMemo(() => {
    return (
      dataLoadingState === DataLoadingState.loading ||
      dataLoadingState === DataLoadingState.loadingMore
    );
  }, [dataLoadingState]);

  useEffect(() => {
    setPageRows((currentPageRows) => {
      if (pageInfo.activePage !== 0 && currentPageRows[pageInfo.activePage]?.length) {
        return currentPageRows;
      }
      const newPageRows = pageInfo.activePage === 0 ? [] : [...currentPageRows];
      newPageRows[pageInfo.activePage] = events;
      return newPageRows;
    });
  }, [events, pageInfo.activePage]);

  const handleOnPanelClosed = useCallback(() => {
    onEventClosed({ tabType: TimelineTabs.query, id: timelineId });

    if (
      expandedDetail[TimelineTabs.query]?.panelView &&
      timelineId === TimelineId.active &&
      showExpandedDetails
    ) {
      activeTimeline.toggleExpandedDetail({});
    }
  }, [onEventClosed, timelineId, expandedDetail, showExpandedDetails]);

  useEffect(() => {
    dispatch(
      timelineActions.updateIsLoading({
        id: timelineId,
        isLoading: isQueryLoading,
      })
    );
  }, [isSourcererLoading, timelineId, dispatch, dataLoadingState, isQueryLoading]);

  const isDatePickerDisabled = useMemo(() => {
    return (combinedQueries && combinedQueries.kqlError != null) || false;
  }, [combinedQueries]);

  return (
    <>
      <InPortal node={timelineEventsCountPortalNode}>
        {totalCount >= 0 ? <EventsCountBadge>{totalCount}</EventsCountBadge> : null}
      </InPortal>
      <TimelineRefetch
        id={`${timelineId}-${TimelineTabs.query}`}
        inputId={InputsModelId.timeline}
        inspect={inspect}
        loading={isQueryLoading}
        refetch={refetch}
        skip={!canQueryTimeline}
      />
      <FullWidthFlexGroup>
        <ScrollableFlexItem>
          <StyledEuiFlyoutHeader
            data-test-subj={`${activeTab}-tab-flyout-header`}
            hasBorder={false}
          >
            <EuiFlexGroup
              alignItems="center"
              gutterSize="s"
              data-test-subj="timeline-date-picker-container"
            >
              {timelineFullScreen && setTimelineFullScreen != null && (
                <ExitFullScreen
                  fullScreen={timelineFullScreen}
                  setFullScreen={setTimelineFullScreen}
                />
              )}
              <EuiFlexItem grow={10}>
                <SuperDatePicker
                  width="auto"
                  id={InputsModelId.timeline}
                  timelineId={timelineId}
                  disabled={isDatePickerDisabled}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <TimelineDatePickerLock />
              </EuiFlexItem>
              <SourcererFlex grow={1}>
                {activeTab === TimelineTabs.query && (
                  <Sourcerer scope={SourcererScopeName.timeline} />
                )}
              </SourcererFlex>
            </EuiFlexGroup>
            <TimelineHeaderContainer data-test-subj="timelineHeader">
              <TimelineHeader
                filterManager={filterManager}
                show={show && activeTab === TimelineTabs.query}
                showCallOutUnauthorizedMsg={showCallOutUnauthorizedMsg}
                status={status}
                timelineId={timelineId}
              />
            </TimelineHeaderContainer>
          </StyledEuiFlyoutHeader>
          <EventDetailsWidthProvider>
            <RootDragDropProvider>
              <TimelineDataTable
                columns={columnsHeader}
                rowRenderers={rowRenderers}
                timelineId={timelineId}
                itemsPerPage={itemsPerPage}
                itemsPerPageOptions={itemsPerPageOptions}
                sort={sort}
                events={rows}
                refetch={refetch}
                dataLoadingState={dataLoadingState}
                totalCount={totalCount}
                onEventClosed={onEventClosed}
                expandedDetail={expandedDetail}
                showExpandedDetails={showExpandedDetails}
                onChangePage={loadPage}
                activeTab={activeTab}
                updatedAt={updatedAt}
              />
            </RootDragDropProvider>
            {showExpandedDetails && (
              <>
                <ScrollableFlexItem grow={1}>
                  <DetailsPanel
                    browserFields={browserFields}
                    handleOnPanelClosed={handleOnPanelClosed}
                    runtimeMappings={runtimeMappings}
                    tabType={TimelineTabs.query}
                    scopeId={timelineId}
                    isFlyoutView
                  />
                </ScrollableFlexItem>
              </>
            )}
          </EventDetailsWidthProvider>
        </ScrollableFlexItem>
      </FullWidthFlexGroup>
    </>
  );
};

const makeMapStateToProps = () => {
  const getShowCallOutUnauthorizedMsg = timelineSelectors.getShowCallOutUnauthorizedMsg();
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getKqlQueryTimeline = timelineSelectors.getKqlFilterKuerySelector();
  const getInputsTimeline = inputsSelectors.getTimelineSelector();
  const mapStateToProps = (state: State, { timelineId }: OwnProps) => {
    const timeline: TimelineModel = getTimeline(state, timelineId) ?? timelineDefaults;
    const input: inputsModel.InputsRange = getInputsTimeline(state);
    const {
      activeTab,
      columns,
      dataProviders,
      expandedDetail,
      filters,
      itemsPerPage,
      itemsPerPageOptions,
      kqlMode,
      show,
      sort,
      status,
      timelineType,
    } = timeline;
    const kqlQueryTimeline = getKqlQueryTimeline(state, timelineId);
    const timelineFilter = kqlMode === 'filter' ? filters || [] : [];

    // return events on empty search
    const kqlQueryExpression =
      isEmpty(dataProviders) &&
      isEmpty(kqlQueryTimeline?.expression ?? '') &&
      timelineType === 'template'
        ? ' '
        : kqlQueryTimeline?.expression ?? '';

    const kqlQueryLanguage =
      isEmpty(dataProviders) && timelineType === 'template'
        ? 'kuery'
        : kqlQueryTimeline?.kind ?? 'kuery';

    return {
      activeTab,
      columns,
      dataProviders,
      end: input.timerange.to,
      expandedDetail,
      filters: timelineFilter,
      timelineId,
      isLive: input.policy.kind === 'interval',
      itemsPerPage,
      itemsPerPageOptions,
      kqlMode,
      kqlQueryExpression,
      kqlQueryLanguage,
      showCallOutUnauthorizedMsg: getShowCallOutUnauthorizedMsg(state),
      show,
      showExpandedDetails:
        !!expandedDetail[TimelineTabs.query] && !!expandedDetail[TimelineTabs.query]?.panelView,
      sort,
      start: input.timerange.from,
      status,
      timerangeKind: input.timerange.kind,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = (dispatch: Dispatch, { timelineId }: OwnProps) => ({
  onEventClosed: (args: ToggleDetailPanel) => {
    dispatch(timelineActions.toggleDetailPanel(args));
  },
});

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

const QueryTabContent = connector(
  React.memo(
    QueryTabContentComponent,
    (prevProps, nextProps) =>
      compareQueryProps(prevProps, nextProps) &&
      prevProps.activeTab === nextProps.activeTab &&
      isTimerangeSame(prevProps, nextProps) &&
      prevProps.isLive === nextProps.isLive &&
      prevProps.itemsPerPage === nextProps.itemsPerPage &&
      prevProps.onEventClosed === nextProps.onEventClosed &&
      prevProps.show === nextProps.show &&
      prevProps.showCallOutUnauthorizedMsg === nextProps.showCallOutUnauthorizedMsg &&
      prevProps.showExpandedDetails === nextProps.showExpandedDetails &&
      prevProps.status === nextProps.status &&
      prevProps.timelineId === nextProps.timelineId &&
      deepEqual(prevProps.columns, nextProps.columns) &&
      deepEqual(prevProps.dataProviders, nextProps.dataProviders) &&
      deepEqual(prevProps.itemsPerPageOptions, nextProps.itemsPerPageOptions) &&
      deepEqual(prevProps.sort, nextProps.sort)
  )
);

// eslint-disable-next-line import/no-default-export
export { QueryTabContent as default };
