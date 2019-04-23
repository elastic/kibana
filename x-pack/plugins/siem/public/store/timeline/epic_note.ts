/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApolloClient } from 'apollo-client';
import { NormalizedCacheObject } from 'apollo-cache-inmemory';
import { get } from 'lodash/fp';
import { Action } from 'redux';
import { Epic } from 'redux-observable';
import { from, empty, Observable } from 'rxjs';
import { filter, mergeMap, switchMap, withLatestFrom, startWith } from 'rxjs/operators';

import { persistTimelineNoteMutation } from '../../containers/timeline/notes/persist.gql_query';
import { PersistTimelineNoteMutation, ResponseNote } from '../../graphql/types';
import { updateNote } from '../app/actions';
import { NotesById } from '../app/model';

import { addNote, addNoteToEvent, updateTimeline, updateIsSaving } from './actions';
import { TimelineById } from './reducer';
import { dispatcherTimelinePersistQueue, refetchQueries } from './epic';

export const timelineNoteActionsType = [addNote.type, addNoteToEvent.type];

export const epicPersistNote = (
  apolloClient: ApolloClient<NormalizedCacheObject>,
  action: Action,
  timeline: TimelineById,
  notes: NotesById,
  timeline$: Observable<TimelineById>,
  notes$: Observable<NotesById>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Observable<any> =>
  from(
    apolloClient.mutate<
      PersistTimelineNoteMutation.Mutation,
      PersistTimelineNoteMutation.Variables
    >({
      mutation: persistTimelineNoteMutation,
      fetchPolicy: 'no-cache',
      variables: {
        noteId: null,
        version: null,
        note: {
          eventId: get('payload.eventId', action),
          note: getNote(get('payload.noteId', action), notes),
          timelineId: timeline[get('payload.id', action)].savedObjectId,
        },
      },
      refetchQueries,
    })
  ).pipe(
    withLatestFrom(timeline$, notes$),
    mergeMap(([result, recentTimeline, recentNotes]) => {
      const noteIdRedux = get('payload.noteId', action);
      const response: ResponseNote = get('data.persistNote', result);

      return [
        recentTimeline[get('payload.id', action)].savedObjectId == null
          ? updateTimeline({
              id: get('payload.id', action),
              timeline: {
                ...recentTimeline[get('payload.id', action)],
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
        updateIsSaving({
          id: get('payload.id', action),
          isSaving: false,
        }),
      ].filter(item => item != null);
    }),
    startWith(updateIsSaving({ id: get('payload.id', action), isSaving: true }))
  );

export const createTimelineNoteEpic = <State>(): Epic<Action, Action, State> => action$ =>
  action$.pipe(
    withLatestFrom(),
    filter(([action]) => timelineNoteActionsType.includes(action.type)),
    switchMap(([action]) => {
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
