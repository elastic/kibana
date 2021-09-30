/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
import { i18n } from '@kbn/i18n';
import { useToasts } from '../../../../../common/lib/kibana';
import { useHostIsolationExceptionsSelector } from '../hooks';
import {
  getDeleteError,
  getItemToDelete,
  isDeletionInProgress,
  wasDeletionSuccessful,
} from '../../store/selector';
import { HostIsolationExceptionsPageAction } from '../../store/action';

export const HostIsolationExceptionDeleteModal = memo<{}>(() => {
  const dispatch = useDispatch<Dispatch<HostIsolationExceptionsPageAction>>();
  const toasts = useToasts();

  const isDeleting = useHostIsolationExceptionsSelector(isDeletionInProgress);
  const exception = useHostIsolationExceptionsSelector(getItemToDelete);
  const wasDeleted = useHostIsolationExceptionsSelector(wasDeletionSuccessful);
  const deleteError = useHostIsolationExceptionsSelector(getDeleteError);

  const onCancel = useCallback(() => {
    dispatch({ type: 'hostIsolationExceptionsMarkToDelete', payload: undefined });
  }, [dispatch]);

  const onConfirm = useCallback(() => {
    dispatch({ type: 'hostIsolationExceptionsSubmitDelete' });
  }, [dispatch]);

  // Show toast for success
  useEffect(() => {
    if (wasDeleted) {
      toasts.addSuccess(
        i18n.translate(
          'xpack.securitySolution.hostIsolationExceptions.deletionDialog.deleteSuccess',
          {
            defaultMessage: '"{name}" has been removed from the Host Isolation Exceptions list.',
            values: { name: exception?.name },
          }
        )
      );

      dispatch({ type: 'hostIsolationExceptionsMarkToDelete', payload: undefined });
    }
  }, [dispatch, exception?.name, toasts, wasDeleted]);

  // show toast for failures
  useEffect(() => {
    if (deleteError) {
      toasts.addDanger(
        i18n.translate(
          'xpack.securitySolution.hostIsolationExceptions.deletionDialog.deleteFailure',
          {
            defaultMessage:
              'Unable to remove "{name}" from the Host Isolation Exceptions list. Reason: {message}',
            values: { name: exception?.name, message: deleteError.message },
          }
        )
      );
    }
  }, [deleteError, exception?.name, toasts]);

  return (
    <EuiModal onClose={onCancel}>
      <EuiModalHeader data-test-subj="hostIsolationExceptionsDeleteModalHeader">
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.securitySolution.hostIsolationExceptions.deletionDialog.title"
            defaultMessage="Delete Host Isolation Exception"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody data-test-subj="hostIsolationExceptionsFilterDeleteModalBody">
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.securitySolution.hostIsolationExceptions.deletionDialog.subtitle"
              defaultMessage='You are deleting exception "{name}".'
              values={{ name: <b className="eui-textBreakWord">{exception?.name}</b> }}
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.securitySolution.hostIsolationExceptions.deletionDialog.confirmation"
              defaultMessage="This action cannot be undone. Are you sure you wish to continue?"
            />
          </p>
        </EuiText>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty
          onClick={onCancel}
          isDisabled={isDeleting}
          data-test-subj="hostIsolationExceptionsDeleteModalCancelButton"
        >
          <FormattedMessage
            id="xpack.securitySolution.hostIsolationExceptions.deletionDialog.cancel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>

        <EuiButton
          fill
          color="danger"
          onClick={onConfirm}
          isLoading={isDeleting}
          data-test-subj="hostIsolationExceptionsDeleteModalConfirmButton"
        >
          <FormattedMessage
            id="xpack.securitySolution.hostIsolationExceptions.deletionDialog.confirmButton"
            defaultMessage="Remove exception"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
});

HostIsolationExceptionDeleteModal.displayName = 'HostIsolationExceptionDeleteModal';
