/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiLoadingSpinner } from '@elastic/eui';
import { FormattedCount } from '../../../../common/components/formatted_number';
import { useDocumentDetailsContext } from '../../shared/context';
import { NOTES_COUNT_TEST_ID, NOTES_LOADING_TEST_ID, NOTES_TITLE_TEST_ID } from './test_ids';
import type { State } from '../../../../common/store';
import type { Note } from '../../../../../common/api/timeline';
import {
  fetchNotesByDocumentIds,
  ReqStatus,
  selectFetchNotesByDocumentIdsError,
  selectFetchNotesByDocumentIdsStatus,
  selectSortedNotesByDocumentId,
} from '../../../../notes/store/notes.slice';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { AlertHeaderBlock } from './alert_header_block';

export const FETCH_NOTES_ERROR = i18n.translate(
  'xpack.securitySolution.notes.fetchNotesErrorLabel',
  {
    defaultMessage: 'Error fetching notes',
  }
);

/**
 * Renders a block with the number of notes for the event
 */
export const Notes = memo(() => {
  const dispatch = useDispatch();
  const { eventId } = useDocumentDetailsContext();
  const { addError: addErrorToast } = useAppToasts();

  useEffect(() => {
    dispatch(fetchNotesByDocumentIds({ documentIds: [eventId] }));
  }, [dispatch, eventId]);

  const fetchStatus = useSelector((state: State) => selectFetchNotesByDocumentIdsStatus(state));
  const fetchError = useSelector((state: State) => selectFetchNotesByDocumentIdsError(state));

  const notes: Note[] = useSelector((state: State) =>
    selectSortedNotesByDocumentId(state, {
      documentId: eventId,
      sort: { field: 'created', direction: 'desc' },
    })
  );

  // show a toast if the fetch notes call fails
  useEffect(() => {
    if (fetchStatus === ReqStatus.Failed && fetchError) {
      addErrorToast(null, {
        title: FETCH_NOTES_ERROR,
      });
    }
  }, [addErrorToast, fetchError, fetchStatus]);

  return (
    <AlertHeaderBlock
      title={
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.header.notesTitle"
          defaultMessage="Notes"
        />
      }
      data-test-subj={NOTES_TITLE_TEST_ID}
    >
      {fetchStatus === ReqStatus.Loading ? (
        <EuiLoadingSpinner data-test-subj={NOTES_LOADING_TEST_ID} size="m" />
      ) : (
        <div data-test-subj={NOTES_COUNT_TEST_ID}>
          <FormattedCount count={notes.length} />
        </div>
      )}
    </AlertHeaderBlock>
  );
});

Notes.displayName = 'Notes';
