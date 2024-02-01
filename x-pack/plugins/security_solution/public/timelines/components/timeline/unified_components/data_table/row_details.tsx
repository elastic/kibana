/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useCallback, useRef, memo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { EuiDataGridSetCellProps } from '@elastic/eui';
import type { TimelineItem } from '../../../../../../common/search_strategy';
import type { State } from '../../../../../common/store';
import type { RowRenderer } from '../../../../../../common/types/timeline';
import { appSelectors } from '../../../../../common/store';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { EventsTrSupplement } from '../../styles';
import { NoteCards } from '../../../notes/note_cards';
import { eventIsPinned } from '../../body/helpers';
import type { TimelineResultNote } from '../../../open_timeline/types';
import { timelineBodySelector } from '../../body/selectors';
import { StatefulRowRenderer } from '../../body/events/stateful_row_renderer';
import { timelineDefaults } from '../../../../store/defaults';
import { timelineActions, timelineSelectors } from '../../../../store';

/** This offset begins at two, because the header row counts as "row 1", and aria-rowindex starts at "1" */
const ARIA_ROW_INDEX_OFFSET = 2;

interface Props {
  rowIndex: number;
  event: TimelineItem;
  setCellProps?: (props: EuiDataGridSetCellProps) => void;
  timelineId: string;
  enabledRowRenderers: RowRenderer[];
}

export const RowDetailsComponent: React.FC<Props> = memo(
  ({ rowIndex, event, setCellProps, timelineId, enabledRowRenderers }) => {
    const dispatch = useDispatch();
    const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
    const timeline = useDeepEqualSelector((state) =>
      timelineId ? getTimeline(state, timelineId) : null
    );

    const onToggleShowNotes = useCallback(() => {
      const row = timeline?.notesMap[event._id];
      if (row?.isAddingNote !== false) {
        dispatch(
          timelineActions.setNotesMap({
            id: timelineId,
            notesMap: {
              ...timeline?.notesMap,
              [event._id]: { ...row, isAddingNote: false },
            },
          })
        );
      }
    }, [event._id, dispatch, timeline?.notesMap, timelineId]);

    useEffect(() => {
      if (setCellProps) {
        setCellProps({ style: { width: '100%', height: 'auto' } });
      }
    }, [setCellProps]);

    const { timeline: { eventIdToNoteIds, pinnedEventIds } = timelineDefaults } = useSelector(
      (state: State) => timelineBodySelector(state, timelineId)
    );

    const associateNote = useCallback(
      (noteId: string, eventId: string) => {
        dispatch(timelineActions.addNoteToEvent({ eventId, id: timelineId, noteId }));
        const isEventPinned = eventIsPinned({
          eventId,
          pinnedEventIds,
        });
        if (!isEventPinned) {
          dispatch(timelineActions.pinEvent({ id: timelineId, eventId: event._id }));
        }
      },
      [dispatch, event._id, pinnedEventIds, timelineId]
    );

    const getNotesByIds = useMemo(() => appSelectors.notesByIdsSelector(), []);
    const notesById = useDeepEqualSelector(getNotesByIds);
    const getNotes = useCallback(
      (eventId: string) => {
        const noteIds: string[] = eventIdToNoteIds[eventId] || [];
        return appSelectors.getNotes(notesById, noteIds).map((note) => ({
          savedObjectId: note.saveObjectId,
          note: note.note,
          noteId: note.id,
          updated: (note.lastEdit ?? note.created).getTime(),
          updatedBy: note.user,
        })) as unknown as TimelineResultNote[];
      },
      [eventIdToNoteIds, notesById]
    );

    const showAddNote = useMemo(() => {
      return (timeline?.notesMap && timeline?.notesMap[event._id]?.isAddingNote) ?? false;
    }, [event._id, timeline?.notesMap]);

    const containerRef = useRef<HTMLDivElement | null>(null);
    // notes here
    // console.log(eventIdToNoteIds, notesById, getNotes(event._id), notesMap);
    // The custom row details is actually a trailing control column cell with
    // a hidden header. This is important for accessibility and markup reasons
    // @see https://fuschia-stretch.glitch.me/ for more
    return (
      <>
        <EventsTrSupplement
          className="siemEventsTable__trSupplement--notes"
          data-test-subj="event-notes-flex-item"
          $display="block"
        >
          <NoteCards
            ariaRowindex={rowIndex + ARIA_ROW_INDEX_OFFSET}
            associateNote={(noteId: string) => associateNote(noteId, event._id)}
            data-test-subj="note-cards"
            notes={getNotes(event._id)}
            showAddNote={showAddNote}
            toggleShowAddNote={() => onToggleShowNotes()}
            eventIdToNoteIds={eventIdToNoteIds}
            timelineId={timelineId}
          />
        </EventsTrSupplement>
        {enabledRowRenderers.length > 0 ? (
          <EuiFlexGroup gutterSize="none" justifyContent="center">
            <EuiFlexItem grow={false}>
              <EventsTrSupplement>
                <StatefulRowRenderer
                  ariaRowindex={rowIndex + ARIA_ROW_INDEX_OFFSET}
                  containerRef={containerRef}
                  event={event}
                  lastFocusedAriaColindex={rowIndex - 1}
                  rowRenderers={enabledRowRenderers}
                  timelineId={timelineId}
                />
              </EventsTrSupplement>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : null}
      </>
    );
  }
);
RowDetailsComponent.displayName = 'RowDetailsComponent';

export const RowDetails = React.memo(RowDetailsComponent);
// eslint-disable-next-line import/no-default-export
export { RowDetails as default };