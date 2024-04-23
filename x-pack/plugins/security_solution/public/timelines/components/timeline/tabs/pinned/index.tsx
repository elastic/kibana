/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import React, { useMemo, useCallback, useState, memo } from 'react';
import styled from 'styled-components';
import type { Dispatch } from 'redux';
import type { ConnectedProps } from 'react-redux';
import { connect, useDispatch } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import type { EuiDataGridCustomBodyProps } from '@elastic/eui';
import { DataLoadingState } from '@kbn/unified-data-table';
import type { ControlColumnProps } from '../../../../../../common/types';
import { timelineActions, timelineSelectors } from '../../../../store';
import type { Direction } from '../../../../../../common/search_strategy';
import { useTimelineEvents } from '../../../../containers';
import { defaultHeaders } from '../../body/column_headers/default_headers';
import { StatefulBody } from '../../body';
import { Footer, footerHeight } from '../../footer';
import { requiredFieldsForActions } from '../../../../../detections/components/alerts_table/default_config';
import { EventDetailsWidthProvider } from '../../../../../common/components/events_viewer/event_details_width_context';
import { ControlColumnCellRender } from '../../unified_components/data_table/control_column_cell_render';
import { SourcererScopeName } from '../../../../../common/store/sourcerer/model';
import { timelineDefaults } from '../../../../store/defaults';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { useSourcererDataView } from '../../../../../common/containers/sourcerer';
import { useTimelineFullScreen } from '../../../../../common/containers/use_full_screen';
import type { TimelineModel } from '../../../../store/model';
import type { State } from '../../../../../common/store';
import { calculateTotalPages } from '../../helpers';
import type { ToggleDetailPanel } from '../../../../../../common/types/timeline';
import { TimelineTabs } from '../../../../../../common/types/timeline';
import { DetailsPanel } from '../../../side_panel';
import { ExitFullScreen } from '../../../../../common/components/exit_full_screen';
import { getDefaultControlColumn } from '../../body/control_columns';
import { useLicense } from '../../../../../common/hooks/use_license';
import { HeaderActions } from '../../../../../common/components/header_actions/header_actions';
import { UnifiedTimelineBody } from '../../body/unified_timeline_body';
import { defaultUdtHeaders } from '../../unified_components/default_headers';
import { CustomTimelineDataGridBody } from '../../unified_components/data_table/custom_timeline_data_grid_body';
import { memoizedGetColumnHeaders } from '../query';
import { transformTimelineItemToUnifiedRows } from '../../unified_components/utils';
import {
  FullWidthFlexGroup,
  ScrollableFlexItem,
  StyledEuiFlyoutBody,
  StyledEuiFlyoutFooter,
  VerticalRule,
} from '../shared/layout';
import type { TimelineTabCommonProps } from '../shared/types';

const ExitFullScreenContainer = styled.div`
  width: 180px;
`;

interface PinnedFilter {
  bool: {
    should: Array<{ match_phrase: { _id: string } }>;
    minimum_should_match: number;
  };
}

export type Props = TimelineTabCommonProps & PropsFromRedux;

const trailingControlColumns: ControlColumnProps[] = []; // stable reference

const rowDetailColumn = [
  {
    id: 'row-details',
    columnHeaderType: 'not-filtered',
    width: 0,
    headerCellRender: () => null,
    rowCellRender: () => null,
  },
];

export const PinnedTabContentComponent: React.FC<Props> = ({
  columns,
  timelineId,
  itemsPerPage,
  itemsPerPageOptions,
  pinnedEventIds,
  onEventClosed,
  renderCellValue,
  rowRenderers,
  showExpandedDetails,
  sort,
  expandedDetail,
  eventIdToNoteIds,
  dataView,
}) => {
  const {
    browserFields,
    dataViewId,
    loading: loadingSourcerer,
    runtimeMappings,
    selectedPatterns,
  } = useSourcererDataView(SourcererScopeName.timeline);
  const { setTimelineFullScreen, timelineFullScreen } = useTimelineFullScreen();
  const isEnterprisePlus = useLicense().isEnterprise();
  const ACTION_BUTTON_COUNT = isEnterprisePlus ? 6 : 5;
  const unifiedComponentsInTimelineEnabled = useIsExperimentalFeatureEnabled(
    'unifiedComponentsInTimelineEnabled'
  );
  const dispatch = useDispatch();
  const [showNotes, setShowNotes] = useState<{ [eventId: string]: boolean }>({});

  const filterQuery = useMemo(() => {
    if (isEmpty(pinnedEventIds)) {
      return '';
    }
    const filterObj = Object.entries(pinnedEventIds).reduce<PinnedFilter>(
      (acc, [pinnedId, isPinned]) => {
        if (isPinned) {
          return {
            ...acc,
            bool: {
              ...acc.bool,
              should: [
                ...acc.bool.should,
                {
                  match_phrase: {
                    _id: pinnedId,
                  },
                },
              ],
            },
          };
        }
        return acc;
      },
      {
        bool: {
          should: [],
          minimum_should_match: 1,
        },
      }
    );
    try {
      return JSON.stringify(filterObj);
    } catch {
      return '';
    }
  }, [pinnedEventIds]);
  const defaultColumns = useMemo(
    () => (unifiedComponentsInTimelineEnabled ? defaultUdtHeaders : defaultHeaders),
    [unifiedComponentsInTimelineEnabled]
  );

  const localColumns = useMemo(
    () => (isEmpty(columns) ? defaultColumns : columns),
    [columns, defaultColumns]
  );

  const augumentedColumnHeaders = memoizedGetColumnHeaders(localColumns, browserFields, false);
  const timelineQueryFields = useMemo(() => {
    const columnsHeader = isEmpty(columns) ? defaultHeaders : columns;
    const columnFields = columnsHeader.map((c) => c.id);

    return [...columnFields, ...requiredFieldsForActions];
  }, [columns]);

  const timelineQuerySortField = useMemo(
    () =>
      sort.map(({ columnId, columnType, esTypes, sortDirection }) => ({
        field: columnId,
        type: columnType,
        direction: sortDirection as Direction,
        esTypes: esTypes ?? [],
      })),
    [sort]
  );

  const [queryLoadingState, { events, totalCount, pageInfo, loadPage, refreshedAt, refetch }] =
    useTimelineEvents({
      endDate: '',
      id: `pinned-${timelineId}`,
      indexNames: selectedPatterns,
      dataViewId,
      fields: timelineQueryFields,
      limit: itemsPerPage,
      filterQuery,
      runtimeMappings,
      skip: filterQuery === '',
      startDate: '',
      sort: timelineQuerySortField,
      timerangeKind: undefined,
    });

  const isQueryLoading = useMemo(
    () => [DataLoadingState.loading, DataLoadingState.loadingMore].includes(queryLoadingState),
    [queryLoadingState]
  );

  const handleOnPanelClosed = useCallback(() => {
    onEventClosed({ tabType: TimelineTabs.pinned, id: timelineId });
  }, [timelineId, onEventClosed]);

  const leadingControlColumns = useMemo(
    () =>
      getDefaultControlColumn(ACTION_BUTTON_COUNT).map((x) => ({
        ...x,
        headerCellRender: () => {
          return (
            <HeaderActions
              width={x.width}
              browserFields={browserFields}
              columnHeaders={localColumns}
              isEventViewer={false}
              isSelectAllChecked={false}
              onSelectAll={() => {}}
              showEventsSelect={false}
              showSelectAllCheckbox={false}
              sort={sort}
              tabType={TimelineTabs.pinned}
              timelineId={timelineId}
              fieldBrowserOptions={{}}
            />
          );
        },
        rowCellRender: ControlColumnCellRender,
      })),
    [ACTION_BUTTON_COUNT, browserFields, localColumns, sort, timelineId]
  );
  const tableRows = useMemo(
    () => transformTimelineItemToUnifiedRows({ events, dataView }),
    [events, dataView]
  );

  const RenderCustomGridBody = useCallback(
    ({
      Cell,
      visibleColumns,
      visibleRowData,
      setCustomGridBodyProps,
    }: EuiDataGridCustomBodyProps) => {
      if (events) {
        return (
          <CustomTimelineDataGridBody
            Cell={Cell}
            enabledRowRenderers={rowRenderers}
            eventIdToNoteIds={eventIdToNoteIds}
            setCustomGridBodyProps={setCustomGridBodyProps}
            events={events}
            rows={tableRows}
            visibleColumns={visibleColumns}
            visibleRowData={visibleRowData}
          />
        );
      }
    },
    [events, eventIdToNoteIds, rowRenderers, tableRows]
  );

  if (unifiedComponentsInTimelineEnabled) {
    return (
      <UnifiedTimelineBody
        header={<></>}
        columns={augumentedColumnHeaders}
        rowRenderers={rowRenderers}
        timelineId={timelineId}
        itemsPerPage={itemsPerPage}
        itemsPerPageOptions={itemsPerPageOptions}
        sort={sort}
        events={events}
        refetch={refetch}
        dataLoadingState={queryLoadingState}
        pinnedEventIds={pinnedEventIds}
        totalCount={events.length}
        onEventClosed={onEventClosed}
        expandedDetail={expandedDetail}
        showExpandedDetails={showExpandedDetails}
        onChangePage={loadPage}
        activeTab={TimelineTabs.pinned}
        updatedAt={refreshedAt}
        isTextBasedQuery={false}
        pageInfo={pageInfo}
        leadingControlColumns={leadingControlColumns}
        trailingControlColumns={rowDetailColumn}
        renderCustomGridBody={RenderCustomGridBody}
      />
    );
  }

  return (
    <>
      <FullWidthFlexGroup data-test-subj={`${TimelineTabs.pinned}-tab`}>
        <ScrollableFlexItem grow={2}>
          {timelineFullScreen && setTimelineFullScreen != null && (
            <ExitFullScreenContainer>
              <ExitFullScreen
                fullScreen={timelineFullScreen}
                setFullScreen={setTimelineFullScreen}
              />
            </ExitFullScreenContainer>
          )}
          <EventDetailsWidthProvider>
            <StyledEuiFlyoutBody
              data-test-subj={`${TimelineTabs.pinned}-tab-flyout-body`}
              className="timeline-flyout-body"
            >
              <StatefulBody
                activePage={pageInfo.activePage}
                browserFields={browserFields}
                data={events}
                id={timelineId}
                refetch={refetch}
                renderCellValue={renderCellValue}
                rowRenderers={rowRenderers}
                sort={sort}
                tabType={TimelineTabs.pinned}
                totalPages={calculateTotalPages({
                  itemsCount: totalCount,
                  itemsPerPage,
                })}
                leadingControlColumns={leadingControlColumns}
                trailingControlColumns={trailingControlColumns}
              />
            </StyledEuiFlyoutBody>
            <StyledEuiFlyoutFooter
              data-test-subj={`${TimelineTabs.pinned}-tab-flyout-footer`}
              className="timeline-flyout-footer"
            >
              <Footer
                activePage={pageInfo.activePage}
                data-test-subj="timeline-footer"
                updatedAt={refreshedAt}
                height={footerHeight}
                id={timelineId}
                isLive={false}
                isLoading={isQueryLoading || loadingSourcerer}
                itemsCount={events.length}
                itemsPerPage={itemsPerPage}
                itemsPerPageOptions={itemsPerPageOptions}
                onChangePage={loadPage}
                totalCount={totalCount}
              />
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
                tabType={TimelineTabs.pinned}
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
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const mapStateToProps = (state: State, { timelineId }: TimelineTabCommonProps) => {
    const timeline: TimelineModel = getTimeline(state, timelineId) ?? timelineDefaults;
    const {
      columns,
      expandedDetail,
      itemsPerPage,
      itemsPerPageOptions,
      pinnedEventIds,
      sort,
      eventIdToNoteIds,
      pinnedEventsSaveObject,
    } = timeline;

    return {
      columns,
      timelineId,
      itemsPerPage,
      itemsPerPageOptions,
      pinnedEventIds,
      showExpandedDetails:
        !!expandedDetail[TimelineTabs.pinned] && !!expandedDetail[TimelineTabs.pinned]?.panelView,
      sort,
      expandedDetail,
      eventIdToNoteIds,
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

const PinnedTabContent = connector(
  React.memo(
    PinnedTabContentComponent,
    (prevProps, nextProps) =>
      prevProps.itemsPerPage === nextProps.itemsPerPage &&
      prevProps.onEventClosed === nextProps.onEventClosed &&
      prevProps.showExpandedDetails === nextProps.showExpandedDetails &&
      prevProps.timelineId === nextProps.timelineId &&
      deepEqual(prevProps.columns, nextProps.columns) &&
      deepEqual(prevProps.itemsPerPageOptions, nextProps.itemsPerPageOptions) &&
      deepEqual(prevProps.pinnedEventIds, nextProps.pinnedEventIds) &&
      deepEqual(prevProps.sort, nextProps.sort)
  )
);

// eslint-disable-next-line import/no-default-export
export { PinnedTabContent as default };
