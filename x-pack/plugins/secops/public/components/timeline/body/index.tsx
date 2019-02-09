/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHorizontalRule, EuiText } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { Ecs } from '../../../graphql/types';
import { Note } from '../../../lib/note';
import { AddNoteToEvent, UpdateNote } from '../../notes/helpers';
import {
  OnColumnSorted,
  OnFilterChange,
  OnPinEvent,
  OnRangeSelected,
  OnUnPinEvent,
} from '../events';
import { footerHeight } from '../footer';
import { ColumnHeaders } from './column_headers';
import { ColumnHeader } from './column_headers/column_header';
import { Events } from './events';
import { ACTIONS_COLUMN_WIDTH } from './helpers';
import { ColumnRenderer, RowRenderer } from './renderers';
import { Sort } from './sort';

interface Props {
  addNoteToEvent: AddNoteToEvent;
  columnHeaders: ColumnHeader[];
  columnRenderers: ColumnRenderer[];
  data: Ecs[];
  getNotesByIds: (noteIds: string[]) => Note[];
  height: number;
  id: string;
  eventIdToNoteIds: { [eventId: string]: string[] };
  onColumnSorted: OnColumnSorted;
  onFilterChange: OnFilterChange;
  onPinEvent: OnPinEvent;
  onRangeSelected: OnRangeSelected;
  onUnPinEvent: OnUnPinEvent;
  pinnedEventIds: { [eventId: string]: boolean };
  range: string;
  rowRenderers: RowRenderer[];
  sort: Sort;
  updateNote: UpdateNote;
}

const HorizontalScroll = styled.div<{
  height: number;
}>`
  display: block;
  height: ${({ height }) => `${height}px`};
  overflow-x: auto;
  overflow-y: hidden;
  min-height: 0px;
`;

const VerticalScrollContainer = styled.div<{
  height: number;
  width: number;
}>`
  display: block;
  height: ${({ height }) => `${height - footerHeight - 12}px`};
  overflow-x: hidden;
  overflow-y: auto;
  min-width: ${({ width }) => `${width}px`};
  width: 100%;
`;

export const defaultWidth = 1090;

/** Renders the timeline body */
export const Body = pure<Props>(
  ({
    addNoteToEvent,
    columnHeaders,
    columnRenderers,
    data,
    eventIdToNoteIds,
    getNotesByIds,
    height,
    id,
    onColumnSorted,
    onFilterChange,
    onPinEvent,
    onUnPinEvent,
    pinnedEventIds,
    rowRenderers,
    sort,
    updateNote,
  }) => {
    const columnWidths = columnHeaders.reduce(
      (totalWidth, header) => totalWidth + header.minWidth,
      ACTIONS_COLUMN_WIDTH
    );

    return (
      <HorizontalScroll data-test-subj="horizontal-scroll" height={height}>
        <EuiText size="s">
          <ColumnHeaders
            actionsColumnWidth={ACTIONS_COLUMN_WIDTH}
            columnHeaders={columnHeaders}
            onColumnSorted={onColumnSorted}
            onFilterChange={onFilterChange}
            sort={sort}
            timelineId={id}
          />

          <EuiHorizontalRule margin="xs" />

          <VerticalScrollContainer
            data-test-subj="vertical-scroll-container"
            height={height}
            width={columnWidths}
          >
            <Events
              addNoteToEvent={addNoteToEvent}
              columnHeaders={columnHeaders}
              columnRenderers={columnRenderers}
              data={data}
              eventIdToNoteIds={eventIdToNoteIds}
              getNotesByIds={getNotesByIds}
              id={id}
              onPinEvent={onPinEvent}
              onUnPinEvent={onUnPinEvent}
              pinnedEventIds={pinnedEventIds}
              rowRenderers={rowRenderers}
              updateNote={updateNote}
            />
          </VerticalScrollContainer>
        </EuiText>
      </HorizontalScroll>
    );
  }
);
