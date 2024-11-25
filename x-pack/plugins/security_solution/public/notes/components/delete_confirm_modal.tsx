/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  deleteNotes,
  userClosedDeleteModal,
  selectNotesTablePendingDeleteIds,
  selectDeleteNotesStatus,
  ReqStatus,
} from '..';

export const DELETE = i18n.translate('xpack.securitySolution.notes.management.deleteAction', {
  defaultMessage: 'Delete',
});
export const DELETE_NOTES_CONFIRM = (selectedNotes: number) =>
  i18n.translate('xpack.securitySolution.notes.management.deleteNotesConfirm', {
    values: { selectedNotes },
    defaultMessage:
      'Are you sure you want to delete {selectedNotes} {selectedNotes, plural, one {note} other {notes}}?',
  });
export const DELETE_NOTES_CANCEL = i18n.translate(
  'xpack.securitySolution.notes.management.deleteNotesCancel',
  {
    defaultMessage: 'Cancel',
  }
);

/**
 * Renders a confirmation modal to delete notes in the notes management page
 */
export const DeleteConfirmModal = React.memo(() => {
  const dispatch = useDispatch();
  const pendingDeleteIds = useSelector(selectNotesTablePendingDeleteIds);
  const deleteNotesStatus = useSelector(selectDeleteNotesStatus);
  const deleteLoading = deleteNotesStatus === ReqStatus.Loading;

  const onCancel = useCallback(() => {
    dispatch(userClosedDeleteModal());
  }, [dispatch]);

  const onConfirm = useCallback(() => {
    dispatch(deleteNotes({ ids: pendingDeleteIds, refetch: true }));
  }, [dispatch, pendingDeleteIds]);

  return (
    <EuiConfirmModal
      aria-labelledby={'delete-notes-modal'}
      title={DELETE}
      onCancel={onCancel}
      onConfirm={onConfirm}
      isLoading={deleteLoading}
      cancelButtonText={DELETE_NOTES_CANCEL}
      confirmButtonText={DELETE}
      buttonColor="danger"
      defaultFocusedButton="confirm"
    >
      {DELETE_NOTES_CONFIRM(pendingDeleteIds.length)}
    </EuiConfirmModal>
  );
});

DeleteConfirmModal.displayName = 'DeleteConfirmModal';
