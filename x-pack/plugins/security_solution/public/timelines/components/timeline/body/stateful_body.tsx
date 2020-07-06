/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import React, { useCallback, useEffect, useMemo } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import deepEqual from 'fast-deep-equal';

import { TimelineId } from '../../../../../common/types/timeline';
import { BrowserFields } from '../../../../common/containers/source';
import { TimelineItem } from '../../../../graphql/types';
import { Note } from '../../../../common/lib/note';
import { appSelectors, State } from '../../../../common/store';
import { appActions } from '../../../../common/store/actions';
import { useManageTimeline } from '../../manage_timeline';
import { ColumnHeaderOptions, TimelineModel } from '../../../store/timeline/model';
import { timelineDefaults } from '../../../store/timeline/defaults';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { AddNoteToEvent, UpdateNote } from '../../notes/helpers';
import {
  OnColumnRemoved,
  OnColumnResized,
  OnColumnSorted,
  OnPinEvent,
  OnRowSelected,
  OnSelectAll,
  OnUnPinEvent,
  OnUpdateColumns,
} from '../events';
import { getColumnHeaders } from './column_headers/helpers';
import { getEventIdToDataMapping } from './helpers';
import { Body } from './index';
import { columnRenderers, rowRenderers } from './renderers';
import { Sort } from './sort';
import { plainRowRenderer } from './renderers/plain_row_renderer';

interface OwnProps {
  browserFields: BrowserFields;
  data: TimelineItem[];
  height?: number;
  id: string;
  isEventViewer?: boolean;
  sort: Sort;
  toggleColumn: (column: ColumnHeaderOptions) => void;
}

type StatefulBodyComponentProps = OwnProps & PropsFromRedux;

export const emptyColumnHeaders: ColumnHeaderOptions[] = [];

const StatefulBodyComponent = React.memo<StatefulBodyComponentProps>(
  ({
    addNoteToEvent,
    applyDeltaToColumnWidth,
    browserFields,
    columnHeaders,
    data,
    eventIdToNoteIds,
    height,
    id,
    isEventViewer = false,
    isSelectAllChecked,
    loadingEventIds,
    notesById,
    pinEvent,
    pinnedEventIds,
    removeColumn,
    selectedEventIds,
    setSelected,
    clearSelected,
    show,
    showCheckboxes,
    showRowRenderers,
    graphEventId,
    sort,
    toggleColumn,
    unPinEvent,
    updateColumns,
    updateNote,
    updateSort,
  }) => {
    const { getManageTimelineById } = useManageTimeline();
    const { queryFields, selectAll } = useMemo(() => getManageTimelineById(id), [
      getManageTimelineById,
      id,
    ]);

    const getNotesByIds = useCallback(
      (noteIds: string[]): Note[] => appSelectors.getNotes(notesById, noteIds),
      [notesById]
    );

    const onAddNoteToEvent: AddNoteToEvent = useCallback(
      ({ eventId, noteId }: { eventId: string; noteId: string }) =>
        addNoteToEvent!({ id, eventId, noteId }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [id]
    );

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

    const onColumnSorted: OnColumnSorted = useCallback(
      (sorted) => {
        updateSort!({ id, sort: sorted });
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [id]
    );

    const onColumnRemoved: OnColumnRemoved = useCallback(
      (columnId) => removeColumn!({ id, columnId }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [id]
    );

    const onColumnResized: OnColumnResized = useCallback(
      ({ columnId, delta }) => applyDeltaToColumnWidth!({ id, columnId, delta }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [id]
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const onPinEvent: OnPinEvent = useCallback((eventId) => pinEvent!({ id, eventId }), [id]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const onUnPinEvent: OnUnPinEvent = useCallback((eventId) => unPinEvent!({ id, eventId }), [id]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const onUpdateNote: UpdateNote = useCallback((note: Note) => updateNote!({ note }), []);

    const onUpdateColumns: OnUpdateColumns = useCallback(
      (columns) => updateColumns!({ id, columns }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [id]
    );

    // Sync to selectAll so parent components can select all events
    useEffect(() => {
      if (selectAll) {
        onSelectAll({ isSelected: true });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectAll]); // onSelectAll dependency not necessary

    return (
      <Body
        addNoteToEvent={onAddNoteToEvent}
        browserFields={browserFields}
        columnHeaders={columnHeaders || emptyColumnHeaders}
        columnRenderers={columnRenderers}
        data={data}
        eventIdToNoteIds={eventIdToNoteIds}
        getNotesByIds={getNotesByIds}
        graphEventId={graphEventId}
        height={height}
        id={id}
        isEventViewer={isEventViewer}
        isSelectAllChecked={isSelectAllChecked}
        loadingEventIds={loadingEventIds}
        onColumnRemoved={onColumnRemoved}
        onColumnResized={onColumnResized}
        onColumnSorted={onColumnSorted}
        onRowSelected={onRowSelected}
        onSelectAll={onSelectAll}
        onFilterChange={noop} // TODO: this is the callback for column filters, which is out scope for this phase of delivery
        onPinEvent={onPinEvent}
        onUnPinEvent={onUnPinEvent}
        onUpdateColumns={onUpdateColumns}
        pinnedEventIds={pinnedEventIds}
        rowRenderers={showRowRenderers ? rowRenderers : [plainRowRenderer]}
        selectedEventIds={selectedEventIds}
        show={id === TimelineId.active ? show : true}
        showCheckboxes={showCheckboxes}
        sort={sort}
        toggleColumn={toggleColumn}
        updateNote={onUpdateNote}
      />
    );
  },
  (prevProps, nextProps) =>
    deepEqual(prevProps.browserFields, nextProps.browserFields) &&
    deepEqual(prevProps.columnHeaders, nextProps.columnHeaders) &&
    deepEqual(prevProps.data, nextProps.data) &&
    prevProps.eventIdToNoteIds === nextProps.eventIdToNoteIds &&
    prevProps.graphEventId === nextProps.graphEventId &&
    deepEqual(prevProps.notesById, nextProps.notesById) &&
    prevProps.height === nextProps.height &&
    prevProps.id === nextProps.id &&
    prevProps.isEventViewer === nextProps.isEventViewer &&
    prevProps.isSelectAllChecked === nextProps.isSelectAllChecked &&
    prevProps.loadingEventIds === nextProps.loadingEventIds &&
    prevProps.pinnedEventIds === nextProps.pinnedEventIds &&
    prevProps.show === nextProps.show &&
    prevProps.selectedEventIds === nextProps.selectedEventIds &&
    prevProps.showCheckboxes === nextProps.showCheckboxes &&
    prevProps.showRowRenderers === nextProps.showRowRenderers &&
    prevProps.sort === nextProps.sort
);

StatefulBodyComponent.displayName = 'StatefulBodyComponent';

const makeMapStateToProps = () => {
  const memoizedColumnHeaders: (
    headers: ColumnHeaderOptions[],
    browserFields: BrowserFields
  ) => ColumnHeaderOptions[] = memoizeOne(getColumnHeaders);

  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getNotesByIds = appSelectors.notesByIdsSelector();
  const mapStateToProps = (state: State, { browserFields, id }: OwnProps) => {
    const timeline: TimelineModel = getTimeline(state, id) ?? timelineDefaults;
    const {
      columns,
      eventIdToNoteIds,
      eventType,
      graphEventId,
      isSelectAllChecked,
      loadingEventIds,
      pinnedEventIds,
      selectedEventIds,
      show,
      showCheckboxes,
      showRowRenderers,
    } = timeline;

    return {
      columnHeaders: memoizedColumnHeaders(columns, browserFields),
      eventIdToNoteIds,
      eventType,
      graphEventId,
      isSelectAllChecked,
      loadingEventIds,
      notesById: getNotesByIds(state),
      id,
      pinnedEventIds,
      selectedEventIds,
      show,
      showCheckboxes,
      showRowRenderers,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = {
  addNoteToEvent: timelineActions.addNoteToEvent,
  applyDeltaToColumnWidth: timelineActions.applyDeltaToColumnWidth,
  clearSelected: timelineActions.clearSelected,
  pinEvent: timelineActions.pinEvent,
  removeColumn: timelineActions.removeColumn,
  removeProvider: timelineActions.removeProvider,
  setSelected: timelineActions.setSelected,
  unPinEvent: timelineActions.unPinEvent,
  updateColumns: timelineActions.updateColumns,
  updateNote: appActions.updateNote,
  updateSort: timelineActions.updateSort,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const StatefulBody = connector(StatefulBodyComponent);
