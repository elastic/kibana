/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import React, { useMemo, useEffect, useCallback } from 'react';
import type { Dispatch } from 'redux';
import type { ConnectedProps } from 'react-redux';
import { connect, useDispatch } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import type { EuiDataGridControlColumn } from '@elastic/eui';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { DataLoadingState } from '@kbn/unified-data-table';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import {
  DocumentDetailsLeftPanelKey,
  DocumentDetailsRightPanelKey,
} from '../../../../../flyout/document_details/shared/constants/panel_keys';
import { LeftPanelNotesTab } from '../../../../../flyout/document_details/left';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { useTimelineDataFilters } from '../../../../containers/use_timeline_data_filters';
import { InputsModelId } from '../../../../../common/store/inputs/constants';
import { useInvalidFilterQuery } from '../../../../../common/hooks/use_invalid_filter_query';
import { timelineActions, timelineSelectors } from '../../../../store';
import type { Direction } from '../../../../../../common/search_strategy';
import type { ControlColumnProps } from '../../../../../../common/types';
import { useTimelineEvents } from '../../../../containers';
import { useKibana } from '../../../../../common/lib/kibana';
import { StatefulBody } from '../../body';
import { Footer, footerHeight } from '../../footer';
import { QueryTabHeader } from './header';
import { calculateTotalPages } from '../../helpers';
import { combineQueries } from '../../../../../common/lib/kuery';
import { TimelineRefetch } from '../../refetch_timeline';
import type {
  KueryFilterQueryKind,
  ToggleDetailPanel,
} from '../../../../../../common/types/timeline';
import { TimelineId, TimelineTabs } from '../../../../../../common/types/timeline';
import { EventDetailsWidthProvider } from '../../../../../common/components/events_viewer/event_details_width_context';
import type { inputsModel, State } from '../../../../../common/store';
import { inputsSelectors } from '../../../../../common/store';
import { SourcererScopeName } from '../../../../../sourcerer/store/model';
import { timelineDefaults } from '../../../../store/defaults';
import { useSourcererDataView } from '../../../../../sourcerer/containers';
import { isActiveTimeline } from '../../../../../helpers';

import type { TimelineModel } from '../../../../store/model';
import { DetailsPanel } from '../../../side_panel';
import { UnifiedTimelineBody } from '../../body/unified_timeline_body';
import {
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
} from '../shared/utils';
import type { TimelineTabCommonProps } from '../shared/types';
import { useTimelineColumns } from '../shared/use_timeline_columns';
import { useTimelineControlColumn } from '../shared/use_timeline_control_columns';

const compareQueryProps = (prevProps: Props, nextProps: Props) =>
  prevProps.kqlMode === nextProps.kqlMode &&
  prevProps.kqlQueryExpression === nextProps.kqlQueryExpression &&
  deepEqual(prevProps.filters, nextProps.filters);

export type Props = TimelineTabCommonProps & PropsFromRedux;

export const QueryTabContentComponent: React.FC<Props> = ({
  activeTab,
  columns,
  dataProviders,
  end,
  filters,
  timelineId,
  isLive,
  itemsPerPage,
  itemsPerPageOptions,
  kqlMode,
  kqlQueryExpression,
  kqlQueryLanguage,
  onEventClosed,
  renderCellValue,
  rowRenderers,
  show,
  showCallOutUnauthorizedMsg,
  showExpandedDetails,
  start,
  status,
  sort,
  timerangeKind,
  expandedDetail,
  pinnedEventIds,
  eventIdToNoteIds,
}) => {
  const dispatch = useDispatch();
  const {
    browserFields,
    dataViewId,
    loading: loadingSourcerer,
    indexPattern,
    runtimeMappings,
    // important to get selectedPatterns from useSourcererDataView
    // in order to include the exclude filters in the search that are not stored in the timeline
    selectedPatterns,
  } = useSourcererDataView(SourcererScopeName.timeline);

  const { uiSettings, timelineDataService } = useKibana().services;
  const {
    query: { filterManager: timelineFilterManager },
  } = timelineDataService;

  const unifiedComponentsInTimelineEnabled = useIsExperimentalFeatureEnabled(
    'unifiedComponentsInTimelineEnabled'
  );

  const getManageTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);

  const currentTimeline = useDeepEqualSelector((state) =>
    getManageTimeline(state, timelineId ?? TimelineId.active)
  );

  const { sampleSize } = currentTimeline;

  const esQueryConfig = useMemo(() => getEsQueryConfig(uiSettings), [uiSettings]);
  const kqlQuery: {
    query: string;
    language: KueryFilterQueryKind;
  } = useMemo(
    () => ({ query: kqlQueryExpression.trim(), language: kqlQueryLanguage }),
    [kqlQueryExpression, kqlQueryLanguage]
  );

  const combinedQueries = useMemo(() => {
    return combineQueries({
      config: esQueryConfig,
      dataProviders,
      indexPattern,
      browserFields,
      filters,
      kqlQuery,
      kqlMode,
    });
  }, [esQueryConfig, dataProviders, indexPattern, browserFields, filters, kqlQuery, kqlMode]);

  useInvalidFilterQuery({
    id: timelineId,
    filterQuery: combinedQueries?.filterQuery,
    kqlError: combinedQueries?.kqlError,
    query: kqlQuery,
    startDate: start,
    endDate: end,
  });

  const isBlankTimeline: boolean =
    isEmpty(dataProviders) &&
    isEmpty(filters) &&
    isEmpty(kqlQuery.query) &&
    combinedQueries?.filterQuery === undefined;

  const canQueryTimeline = useMemo(
    () =>
      combinedQueries != null &&
      loadingSourcerer != null &&
      !loadingSourcerer &&
      !isEmpty(start) &&
      !isEmpty(end) &&
      combinedQueries?.filterQuery !== undefined,
    [combinedQueries, end, loadingSourcerer, start]
  );

  const timelineQuerySortField = useMemo(() => {
    return sort.map(({ columnId, columnType, esTypes, sortDirection }) => ({
      field: columnId,
      direction: sortDirection as Direction,
      esTypes: esTypes ?? [],
      type: columnType,
    }));
  }, [sort]);

  const { augmentedColumnHeaders, defaultColumns, timelineQueryFieldsFromColumns } =
    useTimelineColumns(columns);

  const [
    dataLoadingState,
    { events, inspect, totalCount, pageInfo, loadPage, refreshedAt, refetch },
  ] = useTimelineEvents({
    dataViewId,
    endDate: end,
    fields: timelineQueryFieldsFromColumns,
    filterQuery: combinedQueries?.filterQuery,
    id: timelineId,
    indexNames: selectedPatterns,
    language: kqlQuery.language,
    limit: unifiedComponentsInTimelineEnabled ? sampleSize : itemsPerPage,
    runtimeMappings,
    skip: !canQueryTimeline,
    sort: timelineQuerySortField,
    startDate: start,
    timerangeKind,
  });

  const expandableFlyoutDisabled = useIsExperimentalFeatureEnabled('expandableFlyoutDisabled');
  const { openFlyout } = useExpandableFlyoutApi();
  const securitySolutionNotesEnabled = useIsExperimentalFeatureEnabled(
    'securitySolutionNotesEnabled'
  );
  const onToggleShowNotes = useCallback(
    (eventId?: string) => {
      const indexName = selectedPatterns.join(',');
      if (eventId && !expandableFlyoutDisabled && securitySolutionNotesEnabled) {
        openFlyout({
          right: {
            id: DocumentDetailsRightPanelKey,
            params: {
              id: eventId,
              indexName,
              scopeId: timelineId,
            },
          },
          left: {
            id: DocumentDetailsLeftPanelKey,
            path: {
              tab: LeftPanelNotesTab,
            },
            params: {
              id: eventId,
              indexName,
              scopeId: timelineId,
            },
          },
        });
      }
    },
    [
      expandableFlyoutDisabled,
      openFlyout,
      securitySolutionNotesEnabled,
      selectedPatterns,
      timelineId,
    ]
  );

  const leadingControlColumns = useTimelineControlColumn({
    columns,
    sort,
    timelineId,
    activeTab: TimelineTabs.query,
    refetch,
    onToggleShowNotes,
  });

  useEffect(() => {
    dispatch(
      timelineActions.initializeTimelineSettings({
        id: timelineId,
        defaultColumns,
      })
    );
  }, [dispatch, timelineId, defaultColumns]);

  const isQueryLoading = useMemo(
    () => [DataLoadingState.loading, DataLoadingState.loadingMore].includes(dataLoadingState),
    [dataLoadingState]
  );

  const handleOnPanelClosed = useCallback(() => {
    onEventClosed({ tabType: TimelineTabs.query, id: timelineId });
  }, [onEventClosed, timelineId]);

  useEffect(() => {
    dispatch(
      timelineActions.updateIsLoading({
        id: timelineId,
        isLoading: isQueryLoading || loadingSourcerer,
      })
    );
  }, [loadingSourcerer, timelineId, isQueryLoading, dispatch]);

  // NOTE: The timeline is blank after browser FORWARD navigation (after using back button to navigate to
  // the previous page from the timeline), yet we still see total count. This is because the timeline
  // is not getting refreshed when using browser navigation.
  const showEventsCountBadge = !isBlankTimeline && totalCount >= 0;

  // <Synchronisation of the timeline data service>
  // Sync the timerange
  const timelineFilters = useTimelineDataFilters(isActiveTimeline(timelineId));
  useEffect(() => {
    timelineDataService.query.timefilter.timefilter.setTime({
      from: timelineFilters.from,
      to: timelineFilters.to,
    });
  }, [timelineDataService.query.timefilter.timefilter, timelineFilters.from, timelineFilters.to]);

  // Sync the base query
  useEffect(() => {
    timelineDataService.query.queryString.setQuery(
      // We're using the base query of all combined queries here, to account for all
      // of timeline's query dependencies (data providers, query etc.)
      combinedQueries?.baseKqlQuery || { language: kqlQueryLanguage, query: '' }
    );
  }, [timelineDataService, combinedQueries, kqlQueryLanguage]);
  // </Synchronisation of the timeline data service>

  if (unifiedComponentsInTimelineEnabled) {
    return (
      <>
        <TimelineRefetch
          id={`${timelineId}-${TimelineTabs.query}`}
          inputId={InputsModelId.timeline}
          inspect={inspect}
          loading={isQueryLoading}
          refetch={refetch}
          skip={!canQueryTimeline}
        />

        <UnifiedTimelineBody
          header={
            <QueryTabHeader
              activeTab={activeTab}
              filterManager={timelineFilterManager}
              show={show && activeTab === TimelineTabs.query}
              showCallOutUnauthorizedMsg={showCallOutUnauthorizedMsg}
              status={status}
              timelineId={timelineId}
              showEventsCountBadge={showEventsCountBadge}
              totalCount={totalCount}
            />
          }
          columns={augmentedColumnHeaders}
          rowRenderers={rowRenderers}
          timelineId={timelineId}
          itemsPerPage={itemsPerPage}
          itemsPerPageOptions={itemsPerPageOptions}
          sort={sort}
          events={events}
          refetch={refetch}
          dataLoadingState={dataLoadingState}
          totalCount={isBlankTimeline ? 0 : totalCount}
          onEventClosed={onEventClosed}
          expandedDetail={expandedDetail}
          showExpandedDetails={showExpandedDetails}
          leadingControlColumns={leadingControlColumns as EuiDataGridControlColumn[]}
          eventIdToNoteIds={eventIdToNoteIds}
          pinnedEventIds={pinnedEventIds}
          onChangePage={loadPage}
          activeTab={activeTab}
          updatedAt={refreshedAt}
          isTextBasedQuery={false}
          pageInfo={pageInfo}
        />
      </>
    );
  }

  return (
    <>
      <TimelineRefetch
        id={`${timelineId}-${TimelineTabs.query}`}
        inputId={InputsModelId.timeline}
        inspect={inspect}
        loading={isQueryLoading}
        refetch={refetch}
        skip={!canQueryTimeline}
      />
      <FullWidthFlexGroup gutterSize="none">
        <ScrollableFlexItem grow={2}>
          <QueryTabHeader
            activeTab={activeTab}
            filterManager={timelineFilterManager}
            show={show && activeTab === TimelineTabs.query}
            showCallOutUnauthorizedMsg={showCallOutUnauthorizedMsg}
            status={status}
            timelineId={timelineId}
            showEventsCountBadge={showEventsCountBadge}
            totalCount={totalCount}
          />
          <EventDetailsWidthProvider>
            <StyledEuiFlyoutBody
              data-test-subj={`${TimelineTabs.query}-tab-flyout-body`}
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
                sort={sort}
                tabType={TimelineTabs.query}
                totalPages={calculateTotalPages({
                  itemsCount: totalCount,
                  itemsPerPage,
                })}
                leadingControlColumns={leadingControlColumns as ControlColumnProps[]}
                trailingControlColumns={timelineEmptyTrailingControlColumns}
              />
            </StyledEuiFlyoutBody>

            <StyledEuiFlyoutFooter
              data-test-subj={`${TimelineTabs.query}-tab-flyout-footer`}
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
                handleOnPanelClosed={handleOnPanelClosed}
                runtimeMappings={runtimeMappings}
                tabType={TimelineTabs.query}
                scopeId={timelineId}
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
  const getKqlQueryTimeline = timelineSelectors.getKqlFilterKuerySelector();
  const getInputsTimeline = inputsSelectors.getTimelineSelector();
  const mapStateToProps = (state: State, { timelineId }: TimelineTabCommonProps) => {
    const timeline: TimelineModel = getTimeline(state, timelineId) ?? timelineDefaults;
    const input: inputsModel.InputsRange = getInputsTimeline(state);
    const {
      activeTab,
      columns,
      dataProviders,
      pinnedEventIds,
      eventIdToNoteIds,
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
      pinnedEventIds,
      eventIdToNoteIds,
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

const mapDispatchToProps = (dispatch: Dispatch, { timelineId }: TimelineTabCommonProps) => ({
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
      prevProps.status === nextProps.status &&
      prevProps.timelineId === nextProps.timelineId &&
      deepEqual(prevProps.eventIdToNoteIds, nextProps.eventIdToNoteIds) &&
      deepEqual(prevProps.columns, nextProps.columns) &&
      deepEqual(prevProps.pinnedEventIds, nextProps.pinnedEventIds) &&
      deepEqual(prevProps.dataProviders, nextProps.dataProviders) &&
      deepEqual(prevProps.itemsPerPageOptions, nextProps.itemsPerPageOptions) &&
      deepEqual(prevProps.sort, nextProps.sort)
  )
);

// eslint-disable-next-line import/no-default-export
export { QueryTabContent as default };
