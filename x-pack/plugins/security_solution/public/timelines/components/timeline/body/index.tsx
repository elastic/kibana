/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import memoizeOne from 'memoize-one';
import React, { useCallback, useEffect, useMemo } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import deepEqual from 'fast-deep-equal';

import { RowRendererId, TimelineId } from '../../../../../common/types/timeline';
import { BrowserFields } from '../../../../common/containers/source';
import { TimelineItem } from '../../../../../common/search_strategy/timeline';
import { inputsModel, State } from '../../../../common/store';
import { useManageTimeline } from '../../manage_timeline';
import { ColumnHeaderOptions, TimelineModel } from '../../../store/timeline/model';
import { timelineDefaults } from '../../../store/timeline/defaults';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { OnRowSelected, OnSelectAll } from '../events';
import { getActionsColumnWidth, getColumnHeaders } from './column_headers/helpers';
import { getEventIdToDataMapping } from './helpers';
import { columnRenderers, rowRenderers } from './renderers';
import { Sort } from './sort';
import { plainRowRenderer } from './renderers/plain_row_renderer';
import { EventsTable, TimelineBody, TimelineBodyGlobalStyle } from '../styles';
import { ColumnHeaders } from './column_headers';
import { Events } from './events';
import { DEFAULT_ICON_BUTTON_WIDTH } from '../helpers';

interface OwnProps {
  browserFields: BrowserFields;
  data: TimelineItem[];
  id: string;
  isEventViewer?: boolean;
  sort: Sort;
  refetch: inputsModel.Refetch;
  onRuleChange?: () => void;
}

const NUM_OF_ICON_IN_TIMELINE_ROW = 2;

export const hasAdditionalActions = (id: TimelineId): boolean =>
  [TimelineId.detectionsPage, TimelineId.detectionsRulesDetailsPage, TimelineId.active].includes(
    id
  );

const EXTRA_WIDTH = 4; // px

export type StatefulBodyProps = OwnProps & PropsFromRedux;

export const BodyComponent = React.memo<StatefulBodyProps>(
  ({
    browserFields,
    columnHeaders,
    data,
    eventIdToNoteIds,
    excludedRowRendererIds,
    id,
    isEventViewer = false,
    isSelectAllChecked,
    loadingEventIds,
    pinnedEventIds,
    selectedEventIds,
    setSelected,
    clearSelected,
    onRuleChange,
    showCheckboxes,
    refetch,
    sort,
  }) => {
    const { getManageTimelineById } = useManageTimeline();
    const { queryFields, selectAll } = useMemo(() => getManageTimelineById(id), [
      getManageTimelineById,
      id,
    ]);

    const onRowSelected: OnRowSelected = useCallback(
      ({ eventIds, isSelected }: { eventIds: string[]; isSelected: boolean }) => {
        setSelected!({
          id,
          eventIds: getEventIdToDataMapping(data, eventIds, queryFields),
          isSelected,
          isSelectAllChecked:
            isSelected && Object.keys(selectedEventIds).length + 1 === data.length,
        });
      },
      [setSelected, id, data, selectedEventIds, queryFields]
    );

    const onSelectAll: OnSelectAll = useCallback(
      ({ isSelected }: { isSelected: boolean }) =>
        isSelected
          ? setSelected!({
              id,
              eventIds: getEventIdToDataMapping(
                data,
                data.map((event) => event._id),
                queryFields
              ),
              isSelected,
              isSelectAllChecked: isSelected,
            })
          : clearSelected!({ id }),
      [setSelected, clearSelected, id, data, queryFields]
    );

    // Sync to selectAll so parent components can select all events
    useEffect(() => {
      if (selectAll && !isSelectAllChecked) {
        onSelectAll({ isSelected: true });
      }
    }, [isSelectAllChecked, onSelectAll, selectAll]);

    const enabledRowRenderers = useMemo(() => {
      if (
        excludedRowRendererIds &&
        excludedRowRendererIds.length === Object.keys(RowRendererId).length
      )
        return [plainRowRenderer];

      if (!excludedRowRendererIds) return rowRenderers;

      return rowRenderers.filter((rowRenderer) => !excludedRowRendererIds.includes(rowRenderer.id));
    }, [excludedRowRendererIds]);

    const actionsColumnWidth = useMemo(
      () =>
        getActionsColumnWidth(
          isEventViewer,
          showCheckboxes,
          hasAdditionalActions(id as TimelineId)
            ? DEFAULT_ICON_BUTTON_WIDTH * NUM_OF_ICON_IN_TIMELINE_ROW + EXTRA_WIDTH
            : 0
        ),
      [isEventViewer, showCheckboxes, id]
    );

    const columnWidths = useMemo(
      () =>
        columnHeaders.reduce((totalWidth, header) => totalWidth + header.width, actionsColumnWidth),
      [actionsColumnWidth, columnHeaders]
    );

    return (
      <>
        <TimelineBody data-test-subj="timeline-body" data-timeline-id={id}>
          <EventsTable data-test-subj="events-table" columnWidths={columnWidths}>
            <ColumnHeaders
              actionsColumnWidth={actionsColumnWidth}
              browserFields={browserFields}
              columnHeaders={columnHeaders}
              isEventViewer={isEventViewer}
              isSelectAllChecked={isSelectAllChecked}
              onSelectAll={onSelectAll}
              showEventsSelect={false}
              showSelectAllCheckbox={showCheckboxes}
              sort={sort}
              timelineId={id}
            />

            <Events
              actionsColumnWidth={actionsColumnWidth}
              browserFields={browserFields}
              columnHeaders={columnHeaders}
              columnRenderers={columnRenderers}
              data={data}
              eventIdToNoteIds={eventIdToNoteIds}
              id={id}
              isEventViewer={isEventViewer}
              loadingEventIds={loadingEventIds}
              onRowSelected={onRowSelected}
              pinnedEventIds={pinnedEventIds}
              refetch={refetch}
              rowRenderers={enabledRowRenderers}
              onRuleChange={onRuleChange}
              selectedEventIds={selectedEventIds}
              showCheckboxes={showCheckboxes}
            />
          </EventsTable>
        </TimelineBody>
        <TimelineBodyGlobalStyle />
      </>
    );
  },
  (prevProps, nextProps) =>
    deepEqual(prevProps.browserFields, nextProps.browserFields) &&
    deepEqual(prevProps.columnHeaders, nextProps.columnHeaders) &&
    deepEqual(prevProps.data, nextProps.data) &&
    deepEqual(prevProps.excludedRowRendererIds, nextProps.excludedRowRendererIds) &&
    deepEqual(prevProps.sort, nextProps.sort) &&
    deepEqual(prevProps.eventIdToNoteIds, nextProps.eventIdToNoteIds) &&
    deepEqual(prevProps.pinnedEventIds, nextProps.pinnedEventIds) &&
    deepEqual(prevProps.selectedEventIds, nextProps.selectedEventIds) &&
    deepEqual(prevProps.loadingEventIds, nextProps.loadingEventIds) &&
    prevProps.id === nextProps.id &&
    prevProps.isEventViewer === nextProps.isEventViewer &&
    prevProps.isSelectAllChecked === nextProps.isSelectAllChecked &&
    prevProps.showCheckboxes === nextProps.showCheckboxes
);

BodyComponent.displayName = 'BodyComponent';

const makeMapStateToProps = () => {
  const memoizedColumnHeaders: (
    headers: ColumnHeaderOptions[],
    browserFields: BrowserFields
  ) => ColumnHeaderOptions[] = memoizeOne(getColumnHeaders);

  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const mapStateToProps = (state: State, { browserFields, id }: OwnProps) => {
    const timeline: TimelineModel = getTimeline(state, id) ?? timelineDefaults;
    const {
      columns,
      eventIdToNoteIds,
      excludedRowRendererIds,
      isSelectAllChecked,
      loadingEventIds,
      pinnedEventIds,
      selectedEventIds,
      showCheckboxes,
    } = timeline;

    return {
      columnHeaders: memoizedColumnHeaders(columns, browserFields),
      eventIdToNoteIds,
      excludedRowRendererIds,
      isSelectAllChecked,
      loadingEventIds,
      id,
      pinnedEventIds,
      selectedEventIds,
      showCheckboxes,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = {
  clearSelected: timelineActions.clearSelected,
  setSelected: timelineActions.setSelected,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const StatefulBody = connector(BodyComponent);
