/* eslint-disable react-hooks/rules-of-hooks */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridProps, logicalCSS, useEuiTheme } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiBadge,
  EuiButtonIcon,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useMemo, useEffect, useCallback, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import type { Dispatch } from 'redux';
import type { ConnectedProps } from 'react-redux';
import { connect, useDispatch, useSelector } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import { InPortal } from 'react-reverse-portal';

import { FilterManager, flattenHit } from '@kbn/data-plugin/public';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type { DataTableRecord } from '@kbn/discover-plugin/public/types';
// import type { ControlColumnProps } from '../../../../../common/types';
import { Actions } from '../../../../common/components/header_actions/actions';
import { RowRendererId } from '../../../../../common/types';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { useInvalidFilterQuery } from '../../../../common/hooks/use_invalid_filter_query';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import type { CellValueElementProps } from '../cell_rendering';
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
import { getDefaultControlColumn } from '../body/control_columns';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { Sourcerer } from '../../../../common/components/sourcerer';
import { useLicense } from '../../../../common/hooks/use_license';
import { HeaderActions } from '../../../../common/components/header_actions/header_actions';
import { SecurityCellActionsTrigger } from '../../../../actions/constants';
import { StatefulRowRenderer } from '../body/events/stateful_row_renderer';
import { plainRowRenderer } from '../body/renderers/plain_row_renderer';
import { timelineBodySelector } from '../body/selectors';

/** This offset begins at two, because the header row counts as "row 1", and aria-rowindex starts at "1" */
const ARIA_ROW_INDEX_OFFSET = 2;

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

const StyledEuiFlyoutBody = styled(EuiFlyoutBody)`
  overflow-y: hidden;
  flex: 1;
  margin-top: 10px;

  .euiFlyoutBody__overflow {
    overflow: hidden;
    mask-image: none;
  }

  .euiFlyoutBody__overflowContent {
    padding: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
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

const DatePicker = styled(EuiFlexItem)`
  .euiSuperDatePicker__flexWrapper {
    max-width: none;
    width: auto;
  }
`;
DatePicker.displayName = 'DatePicker';

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

// const trailingControlColumns: ControlColumnProps[] = []; // stable reference

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
  renderCellValue,
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
    sourcererDataView,
  } = useSourcererDataView(SourcererScopeName.timeline);

  const {
    uiSettings,
    discover: { useDiscoverGrid },
  } = useKibana().services;
  const isEnterprisePlus = useLicense().isEnterprise();
  const ACTION_BUTTON_COUNT = isEnterprisePlus ? 6 : 5;

  const getManageTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const currentTimeline = useDeepEqualSelector((state) =>
    getManageTimeline(state, timelineId ?? TimelineId.active)
  );

  const { timeline: { excludedRowRendererIds } = timelineDefaults } = useSelector((state: State) =>
    timelineBodySelector(state, timelineId)
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

  const defaultColumns = useMemo(() => {
    const columnsHeader = isEmpty(columns) ? defaultHeaders : columns;
    return columnsHeader.map((c) => c.id);
  }, [columns]);

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
  }, [activeFilterManager, currentTimeline, dispatch, filterManager, timelineId, uiSettings]);

  const [isQueryLoading, { events, inspect, totalCount, pageInfo, loadPage, updatedAt, refetch }] =
    useTimelineEvents({
      dataViewId,
      endDate: end,
      fields: getTimelineQueryFields(),
      filterQuery: combinedQueries?.filterQuery,
      id: timelineId,
      indexNames: selectedPatterns,
      language: kqlQuery.language,
      limit: itemsPerPage,
      runtimeMappings,
      skip: !canQueryTimeline,
      sort: timelineQuerySortField,
      startDate: start,
      timerangeKind,
    });

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
        isLoading: isQueryLoading || loadingSourcerer,
      })
    );
  }, [loadingSourcerer, timelineId, isQueryLoading, dispatch]);

  const isDatePickerDisabled = useMemo(() => {
    return (combinedQueries && combinedQueries.kqlError != null) || false;
  }, [combinedQueries]);

  const discoverGridRows: Array<DataTableRecord & TimelineItem> = useMemo(
    () =>
      events.map(({ _id, _index, ecs, data }) => {
        const _source = ecs as unknown as Record<string, unknown>;
        const hit = { _id, _index: String(_index), _source };
        return {
          id: _id,
          data,
          ecs,
          raw: hit,
          flattened: flattenHit(hit, sourcererDataView, {
            includeIgnoredValues: true,
          }),
        };
      }),
    [events, sourcererDataView]
  );

  const noop = () => {};
  const leadingControlColumns: EuiDataGridProps['leadingControlColumns'] = useMemo(
    () =>
      getDefaultControlColumn(ACTION_BUTTON_COUNT).map((x) => ({
        ...x,
        headerCellProps: {
          ...x.headerCellProps,
          browserFields,
          columnHeaders: defaultHeaders ?? [],
          sort,
          timelineId: timelineId ?? 'timeline-1',
        },
        rowCellRender: ({ rowIndex, colIndex, columnId }) => (
          <Actions
            ariaRowindex={rowIndex}
            columnId={columnId}
            data={discoverGridRows[rowIndex].data}
            index={colIndex}
            rowIndex={rowIndex}
            setEventsDeleted={noop}
            checked={false}
            columnValues="test"
            ecsData={discoverGridRows[rowIndex].ecs}
            eventId={discoverGridRows[rowIndex].id}
            eventIdToNoteIds={{}}
            loadingEventIds={[]}
            onEventDetailsPanelOpened={noop}
            onRowSelected={noop}
            onRuleChange={noop}
            showCheckboxes={false}
            showNotes={false}
            timelineId={timelineId}
            toggleShowNotes={noop}
            refetch={noop}
            setEventsLoading={noop}
          />
        ),
        headerCellRender: HeaderActions,
      })),
    [ACTION_BUTTON_COUNT, browserFields, discoverGridRows, sort, timelineId]
  );

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState(() => columns.map(({ id }) => id));

  // Pagination
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const onChangePage = useCallback((pageIndex) => {
    setPagination((pagination) => ({ ...pagination, pageIndex }));
  }, []);
  const onChangePageSize = useCallback((pageSize) => {
    setPagination((pagination) => ({ ...pagination, pageSize }));
  }, []);

  // Sorting
  const [sortingColumns, setSortingColumns] = useState(sort);

  const onSort = useCallback((sortColumns) => {
    setSortingColumns(sortColumns);
  }, []);

  const DiscoverGrid = useDiscoverGrid();

  const { euiTheme } = useEuiTheme();

  const renderCustomGridBody: EuiDataGridProps['renderCustomGridBody'] = useCallback(
    ({ Cell, visibleColumns, visibleRowData, setCustomGridBodyProps }) => {
      // Ensure we're displaying correctly-paginated rows
      const visibleRows = discoverGridRows.slice(visibleRowData.startRow, visibleRowData.endRow);

      // Add styling needed for custom grid body rows
      const styles = {
        row: css`
          ${logicalCSS('width', 'fit-content')};
          ${logicalCSS('border-bottom', euiTheme.border.thin)};
          background-color: ${euiTheme.colors.emptyShade};
        `,
        rowCellsWrapper: css`
          display: flex;
        `,
        rowDetailsWrapper: css`
          text-align: center;
          background-color: ${euiTheme.colors.body};
        `,
      };

      // Set custom props onto the grid body wrapper
      const bodyRef = useRef<HTMLDivElement | null>(null);
      useEffect(() => {
        setCustomGridBodyProps({
          ref: bodyRef,
          onScroll: () => console.debug('scrollTop:', bodyRef.current?.scrollTop),
        });
      }, [setCustomGridBodyProps]);

      return (
        <>
          {visibleRows.map((row, rowIndex) => (
            <div role="row" css={styles.row} key={rowIndex}>
              <div css={styles.rowCellsWrapper}>
                {visibleColumns.map((column, colIndex) => {
                  // Skip the row details cell - we'll render it manually outside of the flex wrapper
                  if (column.id !== 'row-details') {
                    return (
                      <Cell
                        colIndex={colIndex}
                        visibleRowIndex={rowIndex}
                        key={`${rowIndex},${colIndex}`}
                      />
                    );
                  }
                })}
              </div>
              <div css={styles.rowDetailsWrapper}>
                <Cell
                  colIndex={visibleColumns.length - 1} // If the row is being shown, it should always be the last index
                  visibleRowIndex={rowIndex}
                />
              </div>
            </div>
          ))}
        </>
      );
    },
    [discoverGridRows, euiTheme.border.thin, euiTheme.colors.body, euiTheme.colors.emptyShade]
  );

  const enabledRowRenderers = useMemo(() => {
    if (
      excludedRowRendererIds &&
      excludedRowRendererIds.length === Object.keys(RowRendererId).length
    )
      return [plainRowRenderer];

    if (!excludedRowRendererIds) return rowRenderers;

    return rowRenderers.filter((rowRenderer) => !excludedRowRendererIds.includes(rowRenderer.id));
  }, [excludedRowRendererIds, rowRenderers]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // The custom row details is actually a trailing control column cell with
  // a hidden header. This is important for accessibility and markup reasons
  // @see https://fuschia-stretch.glitch.me/ for more
  const rowDetails: EuiDataGridProps['trailingControlColumns'] = [
    {
      id: 'row-details',

      // The header cell should be visually hidden, but available to screen readers
      width: 0,
      headerCellRender: () => <>{'Row details'}</>,
      headerCellProps: { className: 'euiScreenReaderOnly' },

      // The footer cell can be hidden to both visual & SR users, as it does not contain meaningful information
      footerCellProps: { style: { display: 'none' } },

      // When rendering this custom cell, we'll want to override
      // the automatic width/heights calculated by EuiDataGrid
      rowCellRender: ({ setCellProps, rowIndex }) => {
        setCellProps({ style: { width: '100%', height: 'auto' } });
        return (
          <>
            <StatefulRowRenderer
              ariaRowindex={rowIndex + ARIA_ROW_INDEX_OFFSET}
              containerRef={containerRef}
              event={discoverGridRows[rowIndex] as TimelineItem}
              lastFocusedAriaColindex={rowIndex - 1}
              rowRenderers={enabledRowRenderers}
              timelineId={timelineId}
            />
          </>
        );
      },
    },
  ];

  const trailingControlColumns: EuiDataGridProps['trailingControlColumns'] = [
    {
      id: 'actions',
      width: 40,
      headerCellRender: () => (
        <EuiScreenReaderOnly>
          <span>{'Actions'}</span>
        </EuiScreenReaderOnly>
      ),
      rowCellRender: () => (
        <EuiButtonIcon iconType="boxesHorizontal" aria-label="See row actions" />
      ),
    },
  ];

  const RenderFooterCellValue: EuiDataGridProps['renderFooterCellValue'] = ({
    columnId,
    setCellProps,
  }) => {
    const value = footerCellValues[columnId];

    useEffect(() => {
      // Turn off the cell expansion button if the footer cell is empty
      if (!value) setCellProps({ isExpandable: false });
    }, [value, setCellProps, columnId]);

    return value || null;
  };

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
      <FullWidthFlexGroup gutterSize="none">
        <ScrollableFlexItem grow={2}>
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
              <DatePicker grow={10}>
                <SuperDatePicker
                  id={InputsModelId.timeline}
                  timelineId={timelineId}
                  disabled={isDatePickerDisabled}
                />
              </DatePicker>
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
            <StyledEuiFlyoutBody
              data-test-subj={`${TimelineTabs.query}-tab-flyout-body`}
              className="timeline-flyout-body"
            >
              <div ref={containerRef}>
                {sourcererDataView && (
                  <DiscoverGrid
                    columns={defaultColumns}
                    columnVisibility={{ visibleColumns, setVisibleColumns }}
                    dataView={sourcererDataView}
                    leadingControlColumns={leadingControlColumns}
                    trailingControlColumns={rowDetails}
                    sorting={{ columns: sortingColumns, onSort }}
                    inMemory={{ level: 'sorting' }}
                    rows={discoverGridRows}
                    renderCellValue={({ rowIndex, columnId }) =>
                      discoverGridRows[rowIndex][columnId]
                    }
                    renderCustomGridBody={renderCustomGridBody}
                    ariaLabelledBy={''}
                    sort={[]}
                    isLoading={isQueryLoading}
                    pagination={{
                      ...pagination,
                      pageSizeOptions: [10, 25, 50],
                      onChangePage,
                      onChangeItemsPerPage: onChangePageSize,
                    }}
                    onAddColumn={function (column: string): void {
                      throw new Error('Function not implemented.');
                    }}
                    onFilter={() => {
                      console.log('onFilter called');
                    }}
                    onRemoveColumn={() => {
                      console.log('onRemoveColumn called');
                    }}
                    onSetColumns={() => {
                      console.log('onSetColumns called');
                    }}
                    renderFooterCellValue={RenderFooterCellValue}
                    rowCount={discoverGridRows.length}
                    sampleSize={0}
                    gridStyle={{ border: 'none', header: 'underline' }}
                    showTimeCol={true}
                    useNewFieldsApi={false}
                    cellActionsTriggerId={SecurityCellActionsTrigger.DEFAULT}
                  />
                )}
                {/* <StatefulBody
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
              /> */}
              </div>
            </StyledEuiFlyoutBody>

            {/* <StyledEuiFlyoutFooter
              data-test-subj={`${TimelineTabs.query}-tab-flyout-footer`}
              className="timeline-flyout-footer"
            >
              {!isBlankTimeline && (
                <Footer
                  activePage={pageInfo?.activePage ?? 0}
                  data-test-subj="timeline-footer"
                  updatedAt={updatedAt}
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
            </StyledEuiFlyoutFooter> */}
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
