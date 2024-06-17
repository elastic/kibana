/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButtonIcon,
  EuiComment,
  EuiCommentList,
  EuiEmptyPrompt,
  EuiLoadingElastic,
  EuiMarkdownFormat,
} from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useQueryTimelineById } from '../../../../timelines/components/open_timeline/helpers';
import type { Note } from '../../../../common/lib/note';
import { appActions, appSelectors } from '../../../../common/store/app';

export interface NotesDetailsProps {
  /**
   *
   */
  eventId: string;
}

/**
 *
 */
export const NotesList = ({ eventId }: NotesDetailsProps) => {
  const dispatch = useDispatch();
  const unifiedComponentsInTimelineEnabled = useIsExperimentalFeatureEnabled(
    'unifiedComponentsInTimelineEnabled'
  );

  const queryTimelineById = useQueryTimelineById();
  const openTimeline = useCallback(
    ({ timelineId }) =>
      queryTimelineById({
        duplicate: false,
        onOpenTimeline: undefined,
        timelineId,
        timelineType: undefined,
        unifiedComponentsInTimelineEnabled,
      }),
    [queryTimelineById, unifiedComponentsInTimelineEnabled]
  );

  const deleteNote = useCallback(
    (note: Note) => dispatch(appActions.deleteNoteRequest({ note })),
    [dispatch]
  );

  const fetchLoading = useSelector((state) => appSelectors.selectLoadingFetchByDocument(state));
  const fetchError = useSelector((state) => appSelectors.selectErrorFetchByDocument(state));
  const addLoading = useSelector((state) => appSelectors.selectLoadingCreateForDocument(state));
  const deleteLoading = useSelector((state) => appSelectors.selectLoadingDeleteNoteIds(state));

  const notesById: { [id: string]: Note } = useSelector((state) => appSelectors.selectById(state));
  const noteIdsByDocumentId: { [documentId: string]: string[] } = useSelector((state) =>
    appSelectors.selectIdsByDocumentId(state)
  );
  const notes: Note[] = noteIdsByDocumentId[eventId]?.map((noteId) => notesById[noteId]) ?? [];

  if (fetchLoading) {
    return <EuiLoadingElastic size="xxl" />;
  }

  if (fetchError) {
    return (
      <EuiEmptyPrompt
        iconType="error"
        color="danger"
        title={<h2>{'Unable to load your notes'}</h2>}
        body={<p>{'No can do'}</p>}
      />
    );
  }

  if (notes.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="editorStrike"
        title={<h2>{'No notes'}</h2>}
        body={<p>{'Add a note to get started'}</p>}
      />
    );
  }

  return (
    <EuiCommentList>
      {notes.map((note, index) => (
        <EuiComment
          key={`note-${index}`}
          username={note.user}
          timestamp={note.created}
          event={'created a note'}
          actions={
            <>
              {note.timelineId && note.timelineId.length > 0 && (
                <EuiButtonIcon
                  title="Open timeline"
                  aria-label="Open timeline"
                  color="text"
                  iconType="timeline"
                  onClick={() => openTimeline(note)}
                />
              )}
              <EuiButtonIcon
                title="Delete note"
                aria-label="Delete note"
                color="text"
                iconType="trash"
                onClick={() => deleteNote(note)}
                isLoading={deleteLoading.indexOf(note.noteId) !== -1}
              />
            </>
          }
        >
          <EuiMarkdownFormat textSize="s">{note.note}</EuiMarkdownFormat>
        </EuiComment>
      ))}
      {addLoading && <EuiLoadingElastic size="xxl" />}
    </EuiCommentList>
  );
};

NotesList.displayName = 'NotesList';
