/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import * as React from 'react';
import uuid from 'uuid';

import { Ecs } from '../../../../graphql/types';
import { Note } from '../../../../lib/note';
import { AddNoteToEvent, UpdateNote } from '../../../notes/helpers';
import { NoteCards } from '../../../notes/note_cards';
import { OnColumnResized, OnPinEvent, OnUnPinEvent } from '../../events';
import { ExpandableEvent } from '../../expandable_event';
import { ColumnHeader } from '../column_headers/column_header';
import { stringifyEvent } from '../helpers';
import { ColumnRenderer, getRowRenderer, RowRenderer } from '../renderers';

import { EventColumnView } from './event_column_view';

interface Props {
  actionsColumnWidth: number;
  addNoteToEvent: AddNoteToEvent;
  columnHeaders: ColumnHeader[];
  columnRenderers: ColumnRenderer[];
  event: Ecs;
  eventIdToNoteIds: { [eventId: string]: string[] };
  getNotesByIds: (noteIds: string[]) => Note[];
  onColumnResized: OnColumnResized;
  onPinEvent: OnPinEvent;
  onUnPinEvent: OnUnPinEvent;
  pinnedEventIds: { [eventId: string]: boolean };
  rowRenderers: RowRenderer[];
  timelineId: string;
  updateNote: UpdateNote;
  width: number;
}

interface State {
  expanded: { [eventId: string]: boolean };
  showNotes: { [eventId: string]: boolean };
}

export const getNewNoteId = (): string => uuid.v4();

export const defaultWidth = 1090;

const emptyNotes: string[] = [];

export class StatefulEvent extends React.PureComponent<Props, State> {
  public readonly state: State = {
    expanded: {},
    showNotes: {},
  };

  public render() {
    const {
      actionsColumnWidth,
      addNoteToEvent,
      columnHeaders,
      columnRenderers,
      event,
      eventIdToNoteIds,
      getNotesByIds,
      onColumnResized,
      onPinEvent,
      onUnPinEvent,
      pinnedEventIds,
      rowRenderers,
      timelineId,
      updateNote,
      width,
    } = this.props;

    return (
      <div data-test-subj="event">
        {getRowRenderer(event, rowRenderers).renderRow({
          data: event,
          width,
          children: (
            <>
              <EuiFlexGroup data-test-subj="event-rows" direction="column" gutterSize="none">
                <EuiFlexItem data-test-subj="event-column-data" grow={false}>
                  <EventColumnView
                    actionsColumnWidth={actionsColumnWidth}
                    associateNote={this.associateNote(event._id, addNoteToEvent, onPinEvent)}
                    columnHeaders={columnHeaders}
                    columnRenderers={columnRenderers}
                    expanded={!!this.state.expanded[event._id]}
                    event={event}
                    eventIdToNoteIds={eventIdToNoteIds}
                    getNotesByIds={getNotesByIds}
                    onColumnResized={onColumnResized}
                    onEventToggled={this.onToggleExpanded(event._id)}
                    onPinEvent={onPinEvent}
                    onUnPinEvent={onUnPinEvent}
                    pinnedEventIds={pinnedEventIds}
                    showNotes={!!this.state.showNotes[event._id]}
                    toggleShowNotes={this.onToggleShowNotes(event._id)}
                    updateNote={updateNote}
                  />
                </EuiFlexItem>

                <EuiFlexItem data-test-subj="event-notes-flex-item" grow={false}>
                  <NoteCards
                    associateNote={this.associateNote(event._id, addNoteToEvent, onPinEvent)}
                    data-test-subj="note-cards"
                    getNewNoteId={getNewNoteId}
                    getNotesByIds={getNotesByIds}
                    noteIds={eventIdToNoteIds[event._id] || emptyNotes}
                    showAddNote={!!this.state.showNotes[event._id]}
                    toggleShowAddNote={this.onToggleShowNotes(event._id)}
                    updateNote={updateNote}
                    width={`${width - 10}px`}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          ),
        })}
        <EuiFlexItem data-test-subj="event-details" grow={true}>
          <ExpandableEvent
            event={event}
            forceExpand={!!this.state.expanded[event._id]}
            hideExpandButton={true}
            stringifiedEvent={stringifyEvent(event)}
            timelineId={timelineId}
          />
        </EuiFlexItem>
      </div>
    );
  }

  private onToggleShowNotes = (eventId: string): (() => void) => () => {
    this.setState(state => ({
      showNotes: {
        ...state.showNotes,
        [eventId]: !state.showNotes[eventId],
      },
    }));
  };

  private onToggleExpanded = (eventId: string): (() => void) => () => {
    this.setState(state => ({
      expanded: {
        ...state.expanded,
        [eventId]: !state.expanded[eventId],
      },
    }));
  };

  private associateNote = (
    eventId: string,
    addNoteToEvent: AddNoteToEvent,
    onPinEvent: OnPinEvent
  ): ((noteId: string) => void) => (noteId: string) => {
    addNoteToEvent({ eventId, noteId });
    onPinEvent(eventId); // pin the event, because it has notes
  };
}
