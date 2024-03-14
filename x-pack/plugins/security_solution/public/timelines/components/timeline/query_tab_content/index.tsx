/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiBadge,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useMemo, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import type { Dispatch } from 'redux';
import type { ConnectedProps } from 'react-redux';
import { connect, useDispatch } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import { InPortal } from 'react-reverse-portal';

import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { DataLoadingState } from '@kbn/unified-data-table';
import type { BrowserFields, ColumnHeaderOptions } from '@kbn/timelines-plugin/common';
import memoizeOne from 'memoize-one';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import type { ControlColumnProps } from '../../../../../common/types';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { useInvalidFilterQuery } from '../../../../common/hooks/use_invalid_filter_query';
import { timelineActions, timelineSelectors } from '../../../store';
import type { CellValueElementProps } from '../cell_rendering';
import type { Direction, TimelineItem } from '../../../../../common/search_strategy';
import { useTimelineEvents } from '../../../containers';
import { useKibana } from '../../../../common/lib/kibana';
import { defaultHeaders } from '../body/column_headers/default_headers';
import { StatefulBody } from '../body';
import { Footer, footerHeight } from '../footer';
import { QueryTabHeader } from './header';
import { calculateTotalPages } from '../helpers';
import { combineQueries } from '../../../../common/lib/kuery';
import { TimelineRefetch } from '../refetch_timeline';
import type {
  KueryFilterQueryKind,
  RowRenderer,
  ToggleDetailPanel,
} from '../../../../../common/types/timeline';
import { TimelineId, TimelineTabs } from '../../../../../common/types/timeline';
import { requiredFieldsForActions } from '../../../../detections/components/alerts_table/default_config';
import { EventDetailsWidthProvider } from '../../../../common/components/events_viewer/event_details_width_context';
import type { inputsModel, State } from '../../../../common/store';
import { inputsSelectors } from '../../../../common/store';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { timelineDefaults } from '../../../store/defaults';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { useTimelineEventsCountPortal } from '../../../../common/hooks/use_timeline_events_count';
import type { TimelineModel } from '../../../store/model';
import { useTimelineFullScreen } from '../../../../common/containers/use_full_screen';
import { DetailsPanel } from '../../side_panel';
import { ExitFullScreen } from '../../../../common/components/exit_full_screen';
import { getDefaultControlColumn } from '../body/control_columns';
import { useLicense } from '../../../../common/hooks/use_license';
import { HeaderActions } from '../../../../common/components/header_actions/header_actions';
import { defaultUdtHeaders } from '../unified_components/default_headers';
import { UnifiedTimelineBody } from '../body/unified_timeline_body';
import { getColumnHeaders } from '../body/column_headers/helpers';

const memoizedGetColumnHeaders: (
  headers: ColumnHeaderOptions[],
  browserFields: BrowserFields,
  isEventRenderedView: boolean
) => ColumnHeaderOptions[] = memoizeOne(getColumnHeaders);

const QueryTabHeaderContainer = styled.div`
  width: 100%;
`;

QueryTabHeaderContainer.displayName = 'TimelineHeaderContainer';

const StyledEuiFlyoutHeader = styled(EuiFlyoutHeader)`
  align-items: stretch;
  box-shadow: none;
  display: flex;
  flex-direction: column;

  &.euiFlyoutHeader {
    ${({ theme }) => `padding: ${theme.eui.euiSizeS} 0 0 0;`}
  }
`;

const StyledEuiFlyoutBody = styled(EuiFlyoutBody)`
  overflow-y: hidden;
  flex: 1;

  .euiFlyoutBody__overflow {
    overflow: hidden;
    mask-image: none;
  }

  .euiFlyoutBody__overflowContent {
    padding: 0;
    height: 100%;
    display: flex;
  }
`;

const StyledEuiFlyoutFooter = styled(EuiFlyoutFooter)`
  background: none;
  &.euiFlyoutFooter {
    ${({ theme }) => `padding: ${theme.eui.euiSizeS} 0;`}
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
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  rowRenderers: RowRenderer[];
  timelineId: string;
}

const EMPTY_EVENTS: TimelineItem[] = [];

export type Props = OwnProps & PropsFromRedux;

const trailingControlColumns: ControlColumnProps[] = []; // stable reference

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
}) => {
  const dispatch = useDispatch();
  const { portalNode: timelineEventsCountPortalNode } = useTimelineEventsCountPortal();
  const { setTimelineFullScreen, timelineFullScreen } = useTimelineFullScreen();
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

  const { uiSettings, timelineFilterManager } = useKibana().services;
  const isEnterprisePlus = useLicense().isEnterprise();
  const ACTION_BUTTON_COUNT = isEnterprisePlus ? 6 : 5;

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

  const defaultColumns = useMemo(
    () => (unifiedComponentsInTimelineEnabled ? defaultUdtHeaders : defaultHeaders),
    [unifiedComponentsInTimelineEnabled]
  );

  const localColumns = useMemo(
    () => (isEmpty(columns) ? defaultColumns : columns),
    [columns, defaultColumns]
  );

  const augumentedColumnHeaders = memoizedGetColumnHeaders(localColumns, browserFields, false);

  const getTimelineQueryFields = () => {
    const columnFields = augumentedColumnHeaders.map((c) => c.id);

    return [...columnFields, ...requiredFieldsForActions];
  };

  const timelineQuerySortField = sort.map(({ columnId, columnType, esTypes, sortDirection }) => ({
    field: columnId,
    direction: sortDirection as Direction,
    esTypes: esTypes ?? [],
    type: columnType,
  }));

  useEffect(() => {
    dispatch(
      timelineActions.initializeTimelineSettings({
        id: timelineId,
        defaultColumns,
      })
    );
  }, [dispatch, timelineId, defaultColumns]);

  const [
    dataLoadingState,
    { events, inspect, totalCount, pageInfo, loadPage, refreshedAt, refetch },
  ] = useTimelineEvents({
    dataViewId,
    endDate: end,
    fields: getTimelineQueryFields(),
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

  const leadingControlColumns = useMemo(
    () =>
      getDefaultControlColumn(ACTION_BUTTON_COUNT).map((x) => ({
        ...x,
        headerCellRender: HeaderActions,
      })),
    [ACTION_BUTTON_COUNT]
  );

  // NOTE: The timeline is blank after browser FORWARD navigation (after using back button to navigate to
  // the previous page from the timeline), yet we still see total count. This is because the timeline
  // is not getting refreshed when using browser navigation.
  const showEventsCountBadge = !isBlankTimeline && totalCount >= 0;

  const header = useMemo(
    () => (
      <StyledEuiFlyoutHeader data-test-subj={`${activeTab}-tab-flyout-header`} hasBorder={false}>
        <InPortal node={timelineEventsCountPortalNode}>
          {showEventsCountBadge ? <EventsCountBadge>{totalCount}</EventsCountBadge> : null}
        </InPortal>
        <EuiFlexGroup gutterSize="s" direction="column">
          {!unifiedComponentsInTimelineEnabled &&
            timelineFullScreen &&
            setTimelineFullScreen != null && (
              <EuiFlexItem>
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <ExitFullScreen
                    fullScreen={timelineFullScreen}
                    setFullScreen={setTimelineFullScreen}
                  />
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
          <EuiFlexItem data-test-subj="timeline-date-picker-container">
            <QueryTabHeaderContainer data-test-subj="timelineHeader">
              <QueryTabHeader
                filterManager={timelineFilterManager}
                show={show && activeTab === TimelineTabs.query}
                showCallOutUnauthorizedMsg={showCallOutUnauthorizedMsg}
                status={status}
                timelineId={timelineId}
              />
            </QueryTabHeaderContainer>
          </EuiFlexItem>
          {/* TODO: This is a temporary solution to hide the KPIs until lens components play nicely with timelines */}
          {/* https://github.com/elastic/kibana/issues/17156 */}
          {/* <EuiFlexItem grow={false}> */}
          {/*   <TimelineKpi timelineId={timelineId} /> */}
          {/* </EuiFlexItem> */}
        </EuiFlexGroup>
      </StyledEuiFlyoutHeader>
    ),
    [
      activeTab,
      timelineFilterManager,
      show,
      showCallOutUnauthorizedMsg,
      status,
      timelineId,
      setTimelineFullScreen,
      timelineFullScreen,
      unifiedComponentsInTimelineEnabled,
      timelineEventsCountPortalNode,
      showEventsCountBadge,
      totalCount,
    ]
  );

  if (unifiedComponentsInTimelineEnabled) {
    return (
      <UnifiedTimelineBody
        header={header}
        columns={augumentedColumnHeaders}
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
        onChangePage={loadPage}
        activeTab={activeTab}
        updatedAt={refreshedAt}
        isTextBasedQuery={false}
        pageInfo={pageInfo}
      />
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
          {header}
          <EventDetailsWidthProvider>
            <StyledEuiFlyoutBody
              data-test-subj={`${TimelineTabs.query}-tab-flyout-body`}
              className="timeline-flyout-body"
            >
              <StatefulBody
                activePage={pageInfo.activePage}
                browserFields={browserFields}
                data={isBlankTimeline ? EMPTY_EVENTS : events}
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
                leadingControlColumns={leadingControlColumns}
                trailingControlColumns={trailingControlColumns}
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
