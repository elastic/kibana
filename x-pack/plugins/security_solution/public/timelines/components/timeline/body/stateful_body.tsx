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
import { BrowserFields, DocValueFields } from '../../../../common/containers/source';
import { TimelineItem } from '../../../../../common/search_strategy/timeline';
import { inputsModel, State } from '../../../../common/store';
import { useManageTimeline } from '../../manage_timeline';
import { ColumnHeaderOptions, TimelineModel } from '../../../store/timeline/model';
import { timelineDefaults } from '../../../store/timeline/defaults';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { OnRowSelected, OnSelectAll, OnUpdateColumns } from '../events';
import { getColumnHeaders } from './column_headers/helpers';
import { getEventIdToDataMapping } from './helpers';
import { Body } from './index';
import { columnRenderers, rowRenderers } from './renderers';
import { Sort } from './sort';
import { plainRowRenderer } from './renderers/plain_row_renderer';
import { ActiveTimelineExpandedEvent } from '../../../containers/active_timeline_context';

interface OwnProps {
  browserFields: BrowserFields;
  data: TimelineItem[];
  docValueFields: DocValueFields[];
  expanded: ActiveTimelineExpandedEvent;
  id: string;
  isEventViewer?: boolean;
  onEventToggled: (event: TimelineItem) => void;
  sort: Sort;
  refetch: inputsModel.Refetch;
  onRuleChange?: () => void;
}

type StatefulBodyComponentProps = OwnProps & PropsFromRedux;

export const emptyColumnHeaders: ColumnHeaderOptions[] = [];

const StatefulBodyComponent = React.memo<StatefulBodyComponentProps>(
  ({
    browserFields,
    columnHeaders,
    data,
    docValueFields,
    eventIdToNoteIds,
    excludedRowRendererIds,
    expanded,
    id,
    isEventViewer = false,
    isSelectAllChecked,
    loadingEventIds,
    pinnedEventIds,
    selectedEventIds,
    setSelected,
    clearSelected,
    onEventToggled,
    onRuleChange,
    show,
    showCheckboxes,
    graphEventId,
    refetch,
    sort,
    updateColumns,
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

    const onUpdateColumns: OnUpdateColumns = useCallback(
      (columns) => updateColumns!({ id, columns }),
      [id, updateColumns]
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

    return (
      <Body
        browserFields={browserFields}
        columnHeaders={columnHeaders || emptyColumnHeaders}
        columnRenderers={columnRenderers}
        data={data}
        docValueFields={docValueFields}
        eventIdToNoteIds={eventIdToNoteIds}
        expanded={expanded}
        graphEventId={graphEventId}
        isEventViewer={isEventViewer}
        isSelectAllChecked={isSelectAllChecked}
        loadingEventIds={loadingEventIds}
        onEventToggled={onEventToggled}
        onRowSelected={onRowSelected}
        onSelectAll={onSelectAll}
        onUpdateColumns={onUpdateColumns}
        pinnedEventIds={pinnedEventIds}
        refetch={refetch}
        onRuleChange={onRuleChange}
        rowRenderers={enabledRowRenderers}
        selectedEventIds={selectedEventIds}
        show={id === TimelineId.active ? show : true}
        showCheckboxes={showCheckboxes}
        sort={sort}
        timelineId={id}
      />
    );
  },
  (prevProps, nextProps) =>
    deepEqual(prevProps.browserFields, nextProps.browserFields) &&
    deepEqual(prevProps.columnHeaders, nextProps.columnHeaders) &&
    deepEqual(prevProps.data, nextProps.data) &&
    deepEqual(prevProps.excludedRowRendererIds, nextProps.excludedRowRendererIds) &&
    deepEqual(prevProps.expanded, nextProps.expanded) &&
    deepEqual(prevProps.docValueFields, nextProps.docValueFields) &&
    prevProps.eventIdToNoteIds === nextProps.eventIdToNoteIds &&
    prevProps.graphEventId === nextProps.graphEventId &&
    prevProps.id === nextProps.id &&
    prevProps.isEventViewer === nextProps.isEventViewer &&
    prevProps.isSelectAllChecked === nextProps.isSelectAllChecked &&
    prevProps.loadingEventIds === nextProps.loadingEventIds &&
    prevProps.onEventToggled === nextProps.onEventToggled &&
    prevProps.pinnedEventIds === nextProps.pinnedEventIds &&
    prevProps.show === nextProps.show &&
    prevProps.selectedEventIds === nextProps.selectedEventIds &&
    prevProps.showCheckboxes === nextProps.showCheckboxes &&
    prevProps.sort === nextProps.sort
);

StatefulBodyComponent.displayName = 'StatefulBodyComponent';

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
      graphEventId,
      isSelectAllChecked,
      loadingEventIds,
      pinnedEventIds,
      selectedEventIds,
      show,
      showCheckboxes,
    } = timeline;

    return {
      columnHeaders: memoizedColumnHeaders(columns, browserFields),
      eventIdToNoteIds,
      excludedRowRendererIds,
      graphEventId,
      isSelectAllChecked,
      loadingEventIds,
      id,
      pinnedEventIds,
      selectedEventIds,
      show,
      showCheckboxes,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = {
  clearSelected: timelineActions.clearSelected,
  removeProvider: timelineActions.removeProvider,
  setSelected: timelineActions.setSelected,
  updateColumns: timelineActions.updateColumns,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const StatefulBody = connector(StatefulBodyComponent);
