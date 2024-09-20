/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingElastic, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Flyouts } from '../../shared/constants/flyouts';
import { timelineSelectors } from '../../../../timelines/store';
import { TimelineId } from '../../../../../common/types';
import { AttachToActiveTimeline } from './attach_to_active_timeline';
import { AddNote } from '../../../../notes/components/add_note';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { NOTES_LOADING_TEST_ID } from '../../../../notes/components/test_ids';
import { NotesList } from '../../../../notes/components/notes_list';
import type { State } from '../../../../common/store';
import type { Note } from '../../../../../common/api/timeline';
import {
  fetchNotesByDocumentIds,
  ReqStatus,
  selectFetchNotesByDocumentIdsError,
  selectFetchNotesByDocumentIdsStatus,
  selectSortedNotesByDocumentId,
} from '../../../../notes/store/notes.slice';
import { useDocumentDetailsContext } from '../../shared/context';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useWhichFlyout } from '../../shared/hooks/use_which_flyout';

export const FETCH_NOTES_ERROR = i18n.translate(
  'xpack.securitySolution.flyout.left.notes.fetchNotesErrorLabel',
  {
    defaultMessage: 'Error fetching notes',
  }
);
export const NO_NOTES = i18n.translate('xpack.securitySolution.flyout.left.notes.noNotesLabel', {
  defaultMessage: 'No notes have been created for this document',
});

/**
 * List all the notes for a document id and allows to create new notes associated with that document.
 * Displayed in the document details expandable flyout left section.
 */
export const NotesDetails = memo(() => {
  const { addError: addErrorToast } = useAppToasts();
  const dispatch = useDispatch();
  const { eventId } = useDocumentDetailsContext();
  const { kibanaSecuritySolutionsPrivileges } = useUserPrivileges();
  const canCreateNotes = kibanaSecuritySolutionsPrivileges.crud;

  // if the flyout is open from a timeline and that timeline is saved, we automatically check the checkbox to associate the note to it
  const isTimelineFlyout = useWhichFlyout() === Flyouts.timeline;

  const activeTimeline = useSelector((state: State) =>
    timelineSelectors.selectTimelineById(state, TimelineId.active)
  );

  // will drive the disabled state of the attach to timeline checkbox in the timeline flyout
  const isTimelineSaved: boolean = useMemo(
    () =>
      activeTimeline != null &&
      activeTimeline.savedObjectId != null &&
      activeTimeline.savedObjectId.length > 0,
    [activeTimeline]
  );

  // allow the attach to timeline component to set the timeline id to pass to the add note component
  const [timelineId, setTimelineId] = useState<string>(activeTimeline?.savedObjectId || '');

  const notes: Note[] = useSelector((state: State) =>
    selectSortedNotesByDocumentId(state, {
      documentId: eventId,
      sort: { field: 'created', direction: 'asc' },
    })
  );
  const fetchStatus = useSelector((state: State) => selectFetchNotesByDocumentIdsStatus(state));
  const fetchError = useSelector((state: State) => selectFetchNotesByDocumentIdsError(state));

  const fetchNotes = useCallback(
    () => dispatch(fetchNotesByDocumentIds({ documentIds: [eventId] })),
    [dispatch, eventId]
  );

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // show a toast if the fetch notes call fails
  useEffect(() => {
    if (fetchStatus === ReqStatus.Failed && fetchError) {
      addErrorToast(null, {
        title: FETCH_NOTES_ERROR,
      });
    }
  }, [addErrorToast, fetchError, fetchStatus]);

  return (
    <>
      {fetchStatus === ReqStatus.Loading && (
        <EuiLoadingElastic data-test-subj={NOTES_LOADING_TEST_ID} size="xxl" />
      )}
      {fetchStatus === ReqStatus.Succeeded && notes.length === 0 ? (
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <p>{NO_NOTES}</p>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <NotesList notes={notes} options={{ hideFlyoutIcon: true }} />
      )}
      {canCreateNotes && (
        <>
          <EuiSpacer />
          <AddNote eventId={eventId} timelineId={timelineId}>
            {isTimelineFlyout && (
              <AttachToActiveTimeline
                timelineId={timelineId}
                setTimelineId={setTimelineId}
                isCheckboxDisabled={!isTimelineSaved}
              />
            )}
          </AddNote>
        </>
      )}
    </>
  );
});

NotesDetails.displayName = 'NotesDetails';
