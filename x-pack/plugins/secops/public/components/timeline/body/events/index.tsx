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
import { OnPinEvent, OnUnPinEvent } from '../../events';
import { ExpandableEvent } from '../../expandable_event';
import { Actions } from '../actions';
import { ColumnHeader } from '../column_headers/column_header';
import { Columns } from '../columns';
import { eventHasNotes, eventIsPinned, getPinOnClick, stringifyEvent } from '../helpers';
import { ColumnRenderer, getRowRenderer, RowRenderer } from '../renderers';

interface Props {
  addNoteToEvent: AddNoteToEvent;
  columnHeaders: ColumnHeader[];
  columnRenderers: ColumnRenderer[];
  data: Ecs[];
  eventIdToNoteIds: { [eventId: string]: string[] };
  getNotesByIds: (noteIds: string[]) => Note[];
  id: string;
  onPinEvent: OnPinEvent;
  onUnPinEvent: OnUnPinEvent;
  pinnedEventIds: { [eventId: string]: boolean };
  rowRenderers: RowRenderer[];
  updateNote: UpdateNote;
}

interface State {
  expanded: { [eventId: string]: boolean };
  showNotes: { [eventId: string]: boolean };
}

export const getNewNoteId = (): string => uuid.v4();

export const defaultWidth = 1090;

const emptyNotes: string[] = [];

export class Events extends React.PureComponent<Props, State> {
  public readonly state: State = {
    expanded: {},
    showNotes: {},
  };

  public render() {
    const {
      addNoteToEvent,
      columnHeaders,
      columnRenderers,
      data,
      eventIdToNoteIds,
      getNotesByIds,
      id,
      onPinEvent,
      onUnPinEvent,
      pinnedEventIds,
      rowRenderers,
      updateNote,
    } = this.props;

    return (
      <EuiFlexGroup data-test-subj="events" direction="column" gutterSize="none">
        {data.map(event => (
          <EuiFlexItem data-test-subj="event" grow={true} key={event._id}>
            {getRowRenderer(event, rowRenderers).renderRow(
              event,
              <>
                <EuiFlexGroup data-test-subj="event-rows" direction="column" gutterSize="none">
                  <EuiFlexItem data-test-subj="event-columns" grow={true}>
                    <EuiFlexGroup
                      data-test-subj="event-columns-group"
                      direction="row"
                      gutterSize="none"
                    >
                      <EuiFlexItem grow={false}>
                        <Actions
                          associateNote={this.associateNote(event._id, addNoteToEvent, onPinEvent)}
                          expanded={!!this.state.expanded[event._id]}
                          data-test-subj="actions"
                          eventId={event._id}
                          eventIsPinned={eventIsPinned({
                            eventId: event._id,
                            pinnedEventIds,
                          })}
                          getNotesByIds={getNotesByIds}
                          noteIds={eventIdToNoteIds[event._id] || emptyNotes}
                          onEventToggled={this.onToggleExpanded(event._id)}
                          onPinClicked={getPinOnClick({
                            allowUnpinning: !eventHasNotes(eventIdToNoteIds[event._id]),
                            eventId: event._id,
                            onPinEvent,
                            onUnPinEvent,
                            pinnedEventIds,
                          })}
                          showNotes={!!this.state.showNotes[event._id]}
                          toggleShowNotes={this.onToggleShowNotes(event._id)}
                          updateNote={updateNote}
                        />
                      </EuiFlexItem>

                      <EuiFlexItem grow={true}>
                        <Columns
                          data-test-subj="columns"
                          columnHeaders={columnHeaders}
                          columnRenderers={columnRenderers}
                          ecs={event}
                        />
                        <NoteCards
                          associateNote={this.associateNote(event._id, addNoteToEvent, onPinEvent)}
                          data-test-subj="note-cards"
                          getNewNoteId={getNewNoteId}
                          getNotesByIds={getNotesByIds}
                          noteIds={eventIdToNoteIds[event._id] || emptyNotes}
                          showAddNote={!!this.state.showNotes[event._id]}
                          toggleShowAddNote={this.onToggleShowNotes(event._id)}
                          updateNote={updateNote}
                          width="90%"
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>

                  <EuiFlexItem data-test-subj="event-details" grow={true}>
                    <ExpandableEvent
                      event={event}
                      forceExpand={!!this.state.expanded[event._id]}
                      hideExpandButton={true}
                      stringifiedEvent={stringifyEvent(event)}
                      timelineId={id}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            )}
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
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
