/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiText } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { BrowserFields } from '../../../containers/source';
import { TimelineItem } from '../../../graphql/types';
import { Note } from '../../../lib/note';
import { AddNoteToEvent, UpdateNote } from '../../notes/helpers';
import {
  OnColumnRemoved,
  OnColumnResized,
  OnColumnSorted,
  OnFilterChange,
  OnPinEvent,
  OnUnPinEvent,
  OnUpdateColumns,
} from '../events';
import { footerHeight } from '../footer';

import { ColumnHeaders } from './column_headers';
import { ColumnHeader } from './column_headers/column_header';
import { Events } from './events';
import { ACTIONS_COLUMN_WIDTH } from './helpers';
import { Sort } from './sort';
import { ColumnRenderer } from './renderers/column_renderer';
import { RowRenderer } from './renderers/row_renderer';

interface Props {
  addNoteToEvent: AddNoteToEvent;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeader[];
  columnRenderers: ColumnRenderer[];
  data: TimelineItem[];
  getNotesByIds: (noteIds: string[]) => Note[];
  height: number;
  id: string;
  isLoading: boolean;
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  onColumnRemoved: OnColumnRemoved;
  onColumnResized: OnColumnResized;
  onColumnSorted: OnColumnSorted;
  onFilterChange: OnFilterChange;
  onPinEvent: OnPinEvent;
  onUpdateColumns: OnUpdateColumns;
  onUnPinEvent: OnUnPinEvent;
  pinnedEventIds: Readonly<Record<string, boolean>>;
  range: string;
  rowRenderers: RowRenderer[];
  sort: Sort;
  updateNote: UpdateNote;
  width: number;
}

const HorizontalScroll = styled.div<{
  height: number;
}>`
  display: block;
  height: ${({ height }) => `${height}px`};
  overflow: hidden;
  overflow-x: auto;
  min-height: 0px;
`;

const VerticalScrollContainer = styled.div<{
  height: number;
  minWidth: number;
}>`
  display: block;
  height: ${({ height }) => `${height - footerHeight - 12}px`};
  overflow: hidden;
  overflow-y: auto;
  min-width: ${({ minWidth }) => `${minWidth}px`};
`;

/** Renders the timeline body */
export const Body = pure<Props>(
  ({
    addNoteToEvent,
    browserFields,
    columnHeaders,
    columnRenderers,
    data,
    eventIdToNoteIds,
    getNotesByIds,
    height,
    id,
    isLoading,
    onColumnRemoved,
    onColumnResized,
    onColumnSorted,
    onFilterChange,
    onPinEvent,
    onUpdateColumns,
    onUnPinEvent,
    pinnedEventIds,
    rowRenderers,
    sort,
    updateNote,
    width,
  }) => {
    const columnWidths = columnHeaders.reduce(
      (totalWidth, header) => totalWidth + header.width,
      ACTIONS_COLUMN_WIDTH
    );

    return (
      <HorizontalScroll data-test-subj="horizontal-scroll" height={height}>
        <EuiText size="s">
          <ColumnHeaders
            actionsColumnWidth={ACTIONS_COLUMN_WIDTH}
            browserFields={browserFields}
            columnHeaders={columnHeaders}
            isLoading={isLoading}
            onColumnRemoved={onColumnRemoved}
            onColumnResized={onColumnResized}
            onColumnSorted={onColumnSorted}
            onFilterChange={onFilterChange}
            onUpdateColumns={onUpdateColumns}
            showEventsSelect={false}
            sort={sort}
            timelineId={id}
            minWidth={columnWidths}
          />

          <VerticalScrollContainer
            data-test-subj="vertical-scroll-container"
            height={height}
            minWidth={columnWidths}
          >
            <Events
              actionsColumnWidth={ACTIONS_COLUMN_WIDTH}
              addNoteToEvent={addNoteToEvent}
              browserFields={browserFields}
              columnHeaders={columnHeaders}
              columnRenderers={columnRenderers}
              data={data}
              eventIdToNoteIds={eventIdToNoteIds}
              getNotesByIds={getNotesByIds}
              id={id}
              isLoading={isLoading}
              onColumnResized={onColumnResized}
              onPinEvent={onPinEvent}
              onUpdateColumns={onUpdateColumns}
              onUnPinEvent={onUnPinEvent}
              pinnedEventIds={pinnedEventIds}
              rowRenderers={rowRenderers}
              updateNote={updateNote}
              minWidth={columnWidths}
              width={width}
            />
          </VerticalScrollContainer>
        </EuiText>
      </HorizontalScroll>
    );
  }
);
