/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, isEmpty, isEqual, noop } from 'lodash/fp';
import * as React from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';

import { BrowserFields } from '../../../containers/source';
import { TimelineItem } from '../../../graphql/types';
import { Note } from '../../../lib/note';
import { appSelectors, State, timelineSelectors } from '../../../store';
import { AddNoteToEvent, UpdateNote } from '../../notes/helpers';
import {
  OnColumnRemoved,
  OnColumnResized,
  OnColumnSorted,
  OnPinEvent,
  OnRangeSelected,
  OnUnPinEvent,
  OnUpdateColumns,
} from '../events';

import { ColumnHeader } from './column_headers/column_header';
import { defaultHeaders } from './column_headers/default_headers';
import { Body } from './index';
import { columnRenderers, rowRenderers } from './renderers';
import { Sort } from './sort';
import { timelineActions, appActions } from '../../../store/actions';
import { TimelineModel } from '../../../store/timeline/model';

interface OwnProps {
  browserFields: BrowserFields;
  data: TimelineItem[];
  id: string;
  isLoading: boolean;
  height: number;
  sort: Sort;
  width: number;
}

interface ReduxProps {
  columnHeaders: ColumnHeader[];
  eventIdToNoteIds?: Readonly<Record<string, string[]>>;
  getNotesByIds: (noteIds: string[]) => Note[];
  pinnedEventIds?: Readonly<Record<string, boolean>>;
  range?: string;
}

interface DispatchProps {
  addNoteToEvent?: ActionCreator<{ id: string; noteId: string; eventId: string }>;
  applyDeltaToColumnWidth?: ActionCreator<{
    id: string;
    columnId: string;
    delta: number;
  }>;
  pinEvent?: ActionCreator<{
    id: string;
    eventId: string;
  }>;
  removeColumn?: ActionCreator<{
    id: string;
    columnId: string;
  }>;
  unPinEvent?: ActionCreator<{
    id: string;
    eventId: string;
  }>;
  updateColumns?: ActionCreator<{
    id: string;
    columns: ColumnHeader[];
  }>;
  updateRange?: ActionCreator<{
    id: string;
    range: string;
  }>;
  updateSort?: ActionCreator<{
    id: string;
    sort: Sort;
  }>;
  updateNote?: ActionCreator<{ note: Note }>;
}

type StatefulBodyComponentProps = OwnProps & ReduxProps & DispatchProps;

class StatefulBodyComponent extends React.PureComponent<StatefulBodyComponentProps> {
  public componentDidUpdate(prevProps: StatefulBodyComponentProps) {
    const { columnHeaders, browserFields } = this.props;
    const newHeaders = getColumnHeaders(
      isEmpty(columnHeaders) ? defaultHeaders : columnHeaders,
      browserFields
    );
    if (
      isEmpty(columnHeaders) ||
      (!isEmpty(prevProps.columnHeaders) && !isEqual(prevProps.columnHeaders, newHeaders))
    ) {
      this.onUpdateColumns(newHeaders);
    }
  }

  public render() {
    const {
      browserFields,
      columnHeaders,
      data,
      eventIdToNoteIds,
      getNotesByIds,
      height,
      id,
      isLoading,
      pinnedEventIds,
      range,
      sort,
      width,
    } = this.props;

    return (
      <Body
        addNoteToEvent={this.onAddNoteToEvent}
        browserFields={browserFields}
        id={id}
        isLoading={isLoading}
        columnHeaders={columnHeaders || []}
        columnRenderers={columnRenderers}
        data={data}
        eventIdToNoteIds={eventIdToNoteIds!}
        getNotesByIds={getNotesByIds}
        height={height}
        onColumnResized={this.onColumnResized}
        onColumnRemoved={this.onColumnRemoved}
        onColumnSorted={this.onColumnSorted}
        onFilterChange={noop} // TODO: this is the callback for column filters, which is out scope for this phase of delivery
        onPinEvent={this.onPinEvent}
        onRangeSelected={this.onRangeSelected}
        onUnPinEvent={this.onUnPinEvent}
        pinnedEventIds={pinnedEventIds!}
        range={range!}
        rowRenderers={rowRenderers}
        sort={sort}
        updateNote={this.onUpdateNote}
        width={width}
      />
    );
  }

  private onAddNoteToEvent: AddNoteToEvent = ({
    eventId,
    noteId,
  }: {
    eventId: string;
    noteId: string;
  }) => this.props.addNoteToEvent!({ id: this.props.id, eventId, noteId });

  private onColumnSorted: OnColumnSorted = sorted => {
    this.props.updateSort!({ id: this.props.id, sort: sorted });
  };

  private onColumnRemoved: OnColumnRemoved = columnId =>
    this.props.removeColumn!({ id: this.props.id, columnId });

  private onColumnResized: OnColumnResized = ({ columnId, delta }) =>
    this.props.applyDeltaToColumnWidth!({ id: this.props.id, columnId, delta });

  private onRangeSelected: OnRangeSelected = selectedRange =>
    this.props.updateRange!({ id: this.props.id, range: selectedRange });

  private onPinEvent: OnPinEvent = eventId => this.props.pinEvent!({ id: this.props.id, eventId });

  private onUnPinEvent: OnUnPinEvent = eventId =>
    this.props.unPinEvent!({ id: this.props.id, eventId });

  private onUpdateNote: UpdateNote = (note: Note) => this.props.updateNote!({ note });

  private onUpdateColumns: OnUpdateColumns = columns =>
    this.props.updateColumns!({ id: this.props.id, columns });
}

export const getColumnHeaders = (
  headers: ColumnHeader[],
  browserFields: BrowserFields
): ColumnHeader[] => {
  return headers.map(header => {
    const splitHeader = header.id.split('.');
    if (splitHeader.length > 1) {
      return { ...header, ...get([splitHeader[0], 'fields', header.id], browserFields) };
    }
    return { ...header, ...get(['base', 'fields', header.id], browserFields) };
  });
};

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const getNotesByIds = appSelectors.notesByIdsSelector();
  const mapStateToProps = (state: State, { id }: OwnProps) => {
    const timeline: TimelineModel = getTimeline(state, id);
    const { columns, eventIdToNoteIds, pinnedEventIds } = timeline;

    return {
      columnHeaders: columns,
      id,
      eventIdToNoteIds,
      getNotesByIds: getNotesByIds(state),
      pinnedEventIds,
    };
  };
  return mapStateToProps;
};

export const StatefulBody = connect(
  makeMapStateToProps,
  {
    addNoteToEvent: timelineActions.addNoteToEvent,
    applyDeltaToColumnWidth: timelineActions.applyDeltaToColumnWidth,
    unPinEvent: timelineActions.unPinEvent,
    updateColumns: timelineActions.updateColumns,
    updateRange: timelineActions.updateRange,
    updateSort: timelineActions.updateSort,
    pinEvent: timelineActions.pinEvent,
    removeColumn: timelineActions.removeColumn,
    removeProvider: timelineActions.removeProvider,
    updateNote: appActions.updateNote,
  }
)(StatefulBodyComponent);
