/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import * as React from 'react';
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
import { ExpandableEvent } from '../expandable_event';
import { footerHeight } from '../footer';
import { Actions } from './actions';
import { ColumnHeaders } from './column_headers';
import { ColumnHeader } from './column_headers/column_header';
import {
  ACTIONS_COLUMN_WIDTH,
  eventHasNotes,
  eventIsPinned,
  getPinOnClick,
  stringifyEvent,
} from './helpers';
import { ColumnRenderer, getColumnRenderer, getRowRenderer, RowRenderer } from './renderers';
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

interface State {
  expanded: { [eventId: string]: boolean };
  showNotes: { [eventId: string]: boolean };
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

const DataDrivenColumns = styled(EuiFlexGroup)`
  margin-left: 5px;
`;

const Column = styled.div<{
  minWidth: string;
  maxWidth: string;
  index: number;
}>`
  background: ${props => (props.index % 2 === 0 ? props.theme.eui.euiColorLightShade : 'inherit')};
  height: 100%;
  max-width: ${props => props.maxWidth};
  min-width: ${props => props.minWidth};
  overflow: hidden;
  overflow-wrap: break-word;
  padding: 5px;
`;

export const defaultWidth = 1090;

const emptyNotes: string[] = [];

/** Renders the timeline body */
export class Body extends React.PureComponent<Props, State> {
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
    } = this.props;

    const columnWidths = columnHeaders.reduce(
      (totalWidth, header) => totalWidth + header.minWidth,
      ACTIONS_COLUMN_WIDTH
    );

    return (
      <HorizontalScroll data-test-subj="horizontal-scroll" height={height}>
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
          <EuiFlexGroup data-test-subj="events" direction="column" gutterSize="none">
            {data.map(ecs => (
              <EuiFlexItem data-test-subj="event" grow={true} key={ecs._id!}>
                {getRowRenderer(ecs, rowRenderers).renderRow(
                  ecs,
                  <>
                    <EuiFlexGroup data-test-subj="event-rows" direction="column" gutterSize="none">
                      <EuiFlexItem data-test-subj="event-columns" grow={true}>
                        <EuiFlexGroup data-test-subj="events" direction="row" gutterSize="none">
                          <EuiFlexItem grow={false}>
                            <Actions
                              associateNote={this.associateNote(
                                ecs._id!,
                                addNoteToEvent,
                                onPinEvent
                              )}
                              expanded={!!this.state.expanded[ecs._id!]}
                              data-test-subj="timeline-row-actions"
                              eventId={ecs._id!}
                              eventIsPinned={eventIsPinned({
                                eventId: ecs._id!,
                                pinnedEventIds,
                              })}
                              getNotesByIds={getNotesByIds}
                              noteIds={eventIdToNoteIds[ecs._id!] || emptyNotes}
                              onEventToggled={this.onToggleExpanded(ecs._id!)}
                              onPinClicked={getPinOnClick({
                                allowUnpinning: !eventHasNotes(eventIdToNoteIds[ecs._id!]),
                                eventId: ecs._id!,
                                onPinEvent,
                                onUnPinEvent,
                                pinnedEventIds,
                              })}
                              showNotes={!!this.state.showNotes[ecs._id!]}
                              toggleShowNotes={this.onToggleShowNotes(ecs._id!)}
                              updateNote={updateNote}
                            />
                          </EuiFlexItem>
                          <EuiFlexItem grow={true}>
                            <DataDrivenColumns
                              data-test-subj="data-driven-columns"
                              gutterSize="none"
                            >
                              {columnHeaders.map((header, index) => (
                                <EuiFlexItem grow={true} key={header.id}>
                                  <Column
                                    data-test-subj="column"
                                    index={index}
                                    maxWidth="100%"
                                    minWidth={`${header.minWidth}px`}
                                  >
                                    {getColumnRenderer(
                                      header.id,
                                      columnRenderers,
                                      ecs
                                    ).renderColumn(header.id, ecs)}
                                  </Column>
                                </EuiFlexItem>
                              ))}
                            </DataDrivenColumns>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiFlexItem>
                      <EuiFlexItem data-test-subj="event-details" grow={true}>
                        <ExpandableEvent
                          event={ecs}
                          forceExpand={!!this.state.expanded[ecs._id!]}
                          hideExpandButton={true}
                          stringifiedEvent={stringifyEvent(ecs)}
                          timelineId={id}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </>
                )}
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </VerticalScrollContainer>
      </HorizontalScroll>
    );
  }

  private onToggleShowNotes = (eventId: string): (() => void) => () => {
    this.setState(state => ({
      showNotes: {
        ...state.showNotes,
        [eventId]: !!!state.showNotes[eventId],
      },
    }));
  };

  private onToggleExpanded = (eventId: string): (() => void) => () => {
    this.setState(state => ({
      expanded: {
        ...state.expanded,
        [eventId]: !!!state.expanded[eventId],
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
