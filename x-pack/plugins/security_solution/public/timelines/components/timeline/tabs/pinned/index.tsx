/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import React, { useMemo, useCallback, memo } from 'react';
import styled from 'styled-components';
import type { Dispatch } from 'redux';
import type { ConnectedProps } from 'react-redux';
import { connect } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import type { EuiDataGridControlColumn } from '@elastic/eui';
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
import { SourcererScopeName } from '../../../../../sourcerer/store/model';
import { timelineDefaults } from '../../../../store/defaults';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { useSourcererDataView } from '../../../../../sourcerer/containers';
import { useTimelineFullScreen } from '../../../../../common/containers/use_full_screen';
import type { TimelineModel } from '../../../../store/model';
import type { State } from '../../../../../common/store';
import { calculateTotalPages } from '../../helpers';
import type { ToggleDetailPanel } from '../../../../../../common/types/timeline';
import { TimelineTabs } from '../../../../../../common/types/timeline';
import { DetailsPanel } from '../../../side_panel';
import { ExitFullScreen } from '../../../../../common/components/exit_full_screen';
import { UnifiedTimelineBody } from '../../body/unified_timeline_body';
import {
  FullWidthFlexGroup,
  ScrollableFlexItem,
  StyledEuiFlyoutBody,
  StyledEuiFlyoutFooter,
  VerticalRule,
} from '../shared/layout';
import type { TimelineTabCommonProps } from '../shared/types';
import { useTimelineColumns } from '../shared/use_timeline_columns';
import { useTimelineControlColumn } from '../shared/use_timeline_control_columns';

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
}) => {
  const {
    browserFields,
    dataViewId,
    loading: loadingSourcerer,
    runtimeMappings,
    selectedPatterns,
  } = useSourcererDataView(SourcererScopeName.timeline);
  const { setTimelineFullScreen, timelineFullScreen } = useTimelineFullScreen();
  const unifiedComponentsInTimelineEnabled = useIsExperimentalFeatureEnabled(
    'unifiedComponentsInTimelineEnabled'
  );

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
  const { augmentedColumnHeaders } = useTimelineColumns(columns);

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

  const leadingControlColumns = useTimelineControlColumn(columns, sort);

  const isQueryLoading = useMemo(
    () => [DataLoadingState.loading, DataLoadingState.loadingMore].includes(queryLoadingState),
    [queryLoadingState]
  );

  const handleOnPanelClosed = useCallback(() => {
    onEventClosed({ tabType: TimelineTabs.pinned, id: timelineId });
  }, [timelineId, onEventClosed]);

  if (unifiedComponentsInTimelineEnabled) {
    return (
      <UnifiedTimelineBody
        header={<></>}
        columns={augmentedColumnHeaders}
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
        eventIdToNoteIds={eventIdToNoteIds}
        showExpandedDetails={showExpandedDetails}
        onChangePage={loadPage}
        activeTab={TimelineTabs.pinned}
        updatedAt={refreshedAt}
        isTextBasedQuery={false}
        pageInfo={pageInfo}
        leadingControlColumns={leadingControlColumns as EuiDataGridControlColumn[]}
        trailingControlColumns={rowDetailColumn}
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
                leadingControlColumns={leadingControlColumns as ControlColumnProps[]}
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
  memo(
    PinnedTabContentComponent,
    (prevProps, nextProps) =>
      prevProps.itemsPerPage === nextProps.itemsPerPage &&
      prevProps.onEventClosed === nextProps.onEventClosed &&
      prevProps.showExpandedDetails === nextProps.showExpandedDetails &&
      prevProps.timelineId === nextProps.timelineId &&
      deepEqual(prevProps.columns, nextProps.columns) &&
      deepEqual(prevProps.eventIdToNoteIds, nextProps.eventIdToNoteIds) &&
      deepEqual(prevProps.itemsPerPageOptions, nextProps.itemsPerPageOptions) &&
      deepEqual(prevProps.pinnedEventIds, nextProps.pinnedEventIds) &&
      deepEqual(prevProps.sort, nextProps.sort)
  )
);

// eslint-disable-next-line import/no-default-export
export { PinnedTabContent as default };
