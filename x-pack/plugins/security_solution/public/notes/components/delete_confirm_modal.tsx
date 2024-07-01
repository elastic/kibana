/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { EuiConfirmModal } from '@elastic/eui';
import * as i18n from './translations';
import {
  deleteNotes,
  userClosedDeleteModal,
  selectNotesTablePendingDeleteIds,
  selectDeleteNotesStatus,
  ReqStatus,
} from '..';

export const DeleteConfirmModal = React.memo(() => {
  const dispatch = useDispatch();
  const pendingDeleteIds = useSelector(selectNotesTablePendingDeleteIds);
  const deleteNotesStatus = useSelector(selectDeleteNotesStatus);
  const deleteLoading = deleteNotesStatus === ReqStatus.Loading;

  const onCancel = useCallback(() => {
    dispatch(userClosedDeleteModal());
  }, [dispatch]);

  const onConfirm = useCallback(() => {
    dispatch(deleteNotes({ ids: pendingDeleteIds }));
  }, [dispatch, pendingDeleteIds]);

  return (
    <EuiConfirmModal
      aria-labelledby={'delete-notes-modal'}
      title={i18n.DELETE_NOTES_MODAL_TITLE}
      onCancel={onCancel}
      onConfirm={onConfirm}
      isLoading={deleteLoading}
      cancelButtonText={i18n.DELETE_NOTES_CANCEL}
      confirmButtonText={i18n.DELETE}
      buttonColor="danger"
      defaultFocusedButton="confirm"
    >
      {i18n.DELETE_NOTES_CONFIRM(pendingDeleteIds.length)}
    </EuiConfirmModal>
  );
});

DeleteConfirmModal.displayName = 'DeleteConfirmModal';
