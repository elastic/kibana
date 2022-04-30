/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import { Action } from 'redux';
import { Epic } from 'redux-observable';
import { from, empty, Observable } from 'rxjs';
import { filter, mergeMap, switchMap, withLatestFrom, startWith, takeUntil } from 'rxjs/operators';

import { updateNote, addError } from '../../../common/store/app/actions';
import { NotesById } from '../../../common/store/app/model';
import { inputsModel } from '../../../common/store/inputs';

import {
  addNote,
  addNoteToEvent,
  endTimelineSaving,
  updateTimeline,
  startTimelineSaving,
  showCallOutUnauthorizedMsg,
} from './actions';
import { myEpicTimelineId } from './my_epic_timeline_id';
import { dispatcherTimelinePersistQueue } from './epic_dispatcher_timeline_persistence_queue';
import { ActionTimeline, TimelineById } from './types';
import { persistNote } from '../../containers/notes/api';
import { ResponseNote } from '../../../../common/types/timeline/note';

export const timelineNoteActionsType = [addNote.type, addNoteToEvent.type];

export const epicPersistNote = (
  action: ActionTimeline,
  timeline: TimelineById,
  notes: NotesById,
  action$: Observable<Action>,
  timeline$: Observable<TimelineById>,
  notes$: Observable<NotesById>,
  allTimelineQuery$: Observable<inputsModel.GlobalQuery>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Observable<any> =>
  from(
    persistNote({
      noteId: null,
      version: null,
      note: {
        eventId: action.payload.eventId,
        note: getNote(action.payload.noteId, notes),
        timelineId: myEpicTimelineId.getTimelineId(),
      },
    })
  ).pipe(
    withLatestFrom(timeline$, notes$, allTimelineQuery$),
    mergeMap(([result, recentTimeline, recentNotes, allTimelineQuery]) => {
      const noteIdRedux = action.payload.noteId;
      const response: ResponseNote = get('data.persistNote', result);
      const callOutMsg = response.code === 403 ? [showCallOutUnauthorizedMsg()] : [];

      if (allTimelineQuery.refetch != null) {
        (allTimelineQuery.refetch as inputsModel.Refetch)();
      }

      return [
        ...callOutMsg,
        recentTimeline[action.payload.id].savedObjectId == null
          ? updateTimeline({
              id: action.payload.id,
              timeline: {
                ...recentTimeline[action.payload.id],
                savedObjectId: response.note.timelineId || null,
                version: response.note.timelineVersion || null,
              },
            })
          : null,
        updateNote({
          note: {
            ...recentNotes[noteIdRedux],
            created:
              response.note.updated != null
                ? new Date(response.note.updated)
                : recentNotes[noteIdRedux].created,
            user:
              response.note.updatedBy != null
                ? response.note.updatedBy
                : recentNotes[noteIdRedux].user,
            saveObjectId: response.note.noteId,
            version: response.note.version,
          },
        }),
        endTimelineSaving({
          id: action.payload.id,
        }),
      ].filter((item) => item != null);
    }),
    startWith(startTimelineSaving({ id: action.payload.id })),
    takeUntil(
      action$.pipe(
        withLatestFrom(timeline$),
        filter(([checkAction, updatedTimeline]) => {
          if (checkAction.type === addError.type) {
            return true;
          }
          if (
            checkAction.type === endTimelineSaving.type &&
            updatedTimeline[get('payload.id', checkAction)].savedObjectId != null
          ) {
            myEpicTimelineId.setTimelineId(
              updatedTimeline[get('payload.id', checkAction)].savedObjectId
            );
            myEpicTimelineId.setTimelineVersion(
              updatedTimeline[get('payload.id', checkAction)].version
            );
            return true;
          }
          return false;
        })
      )
    )
  );

export const createTimelineNoteEpic =
  <State>(): Epic<Action, Action, State> =>
  (action$) =>
    action$.pipe(
      filter((action) => timelineNoteActionsType.includes(action.type)),
      switchMap((action) => {
        dispatcherTimelinePersistQueue.next({ action });
        return empty();
      })
    );

const getNote = (noteId: string | undefined | null, notes: NotesById): string => {
  if (noteId != null) {
    return notes[noteId].note;
  }
  return '';
};
