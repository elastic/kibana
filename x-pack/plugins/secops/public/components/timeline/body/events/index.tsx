/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import * as React from 'react';
import styled from 'styled-components';
import uuid from 'uuid';

import { Ecs } from '../../../../graphql/types';
import { Note } from '../../../../lib/note';
import { AddNoteToEvent, UpdateNote } from '../../../notes/helpers';
import { OnColumnResized, OnPinEvent, OnUnPinEvent } from '../../events';
import { ColumnHeader } from '../column_headers/column_header';
import { ColumnRenderer, RowRenderer } from '../renderers';

import { StatefulEvent } from './stateful_event';

const EventsContainer = styled.div<{
  minWidth: number;
}>`
  display: block;
  overflow: hidden;
  min-width: ${({ minWidth }) => `${minWidth}px`};
`;

interface Props {
  actionsColumnWidth: number;
  addNoteToEvent: AddNoteToEvent;
  columnHeaders: ColumnHeader[];
  columnRenderers: ColumnRenderer[];
  data: Ecs[];
  eventIdToNoteIds: { [eventId: string]: string[] };
  getNotesByIds: (noteIds: string[]) => Note[];
  id: string;
  onColumnResized: OnColumnResized;
  onPinEvent: OnPinEvent;
  onUnPinEvent: OnUnPinEvent;
  minWidth: number;
  pinnedEventIds: { [eventId: string]: boolean };
  rowRenderers: RowRenderer[];
  updateNote: UpdateNote;
  width: number;
}

export const getNewNoteId = (): string => uuid.v4();

export const defaultWidth = 1090;

export class Events extends React.PureComponent<Props> {
  public render() {
    const {
      actionsColumnWidth,
      addNoteToEvent,
      columnHeaders,
      columnRenderers,
      data,
      eventIdToNoteIds,
      getNotesByIds,
      id,
      minWidth,
      onColumnResized,
      onPinEvent,
      onUnPinEvent,
      pinnedEventIds,
      rowRenderers,
      updateNote,
      width,
    } = this.props;

    return (
      <EventsContainer data-test-subj="events" minWidth={minWidth}>
        <EuiFlexGroup data-test-subj="events-flex-group" direction="column" gutterSize="none">
          {data.map(event => (
            <EuiFlexItem data-test-subj="event-flex-item" key={event._id}>
              <StatefulEvent
                actionsColumnWidth={actionsColumnWidth}
                addNoteToEvent={addNoteToEvent}
                columnHeaders={columnHeaders}
                columnRenderers={columnRenderers}
                event={event}
                eventIdToNoteIds={eventIdToNoteIds}
                getNotesByIds={getNotesByIds}
                onColumnResized={onColumnResized}
                onPinEvent={onPinEvent}
                onUnPinEvent={onUnPinEvent}
                pinnedEventIds={pinnedEventIds}
                rowRenderers={rowRenderers}
                timelineId={id}
                updateNote={updateNote}
                width={width}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EventsContainer>
    );
  }
}
