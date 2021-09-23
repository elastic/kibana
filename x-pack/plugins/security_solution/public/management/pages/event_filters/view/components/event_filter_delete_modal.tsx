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
import { useEventFiltersSelector } from '../hooks';
import {
  getDeleteError,
  getItemToDelete,
  isDeletionInProgress,
  wasDeletionSuccessful,
} from '../../store/selector';
import { AppAction } from '../../../../../common/store/actions';
import { useToasts } from '../../../../../common/lib/kibana';

export const EventFilterDeleteModal = memo<{}>(() => {
  const dispatch = useDispatch<Dispatch<AppAction>>();
  const toasts = useToasts();

  const isDeleting = useEventFiltersSelector(isDeletionInProgress);
  const eventFilter = useEventFiltersSelector(getItemToDelete);
  const wasDeleted = useEventFiltersSelector(wasDeletionSuccessful);
  const deleteError = useEventFiltersSelector(getDeleteError);

  const onCancel = useCallback(() => {
    dispatch({ type: 'eventFilterDeletionReset' });
  }, [dispatch]);

  const onConfirm = useCallback(() => {
    dispatch({ type: 'eventFilterDeleteSubmit' });
  }, [dispatch]);

  // Show toast for success
  useEffect(() => {
    if (wasDeleted) {
      toasts.addSuccess(
        i18n.translate('xpack.securitySolution.eventFilters.deletionDialog.deleteSuccess', {
          defaultMessage: '"{name}" has been removed from the Event Filters list.',
          values: { name: eventFilter?.name },
        })
      );

      dispatch({ type: 'eventFilterDeletionReset' });
    }
  }, [dispatch, eventFilter?.name, toasts, wasDeleted]);

  // show toast for failures
  useEffect(() => {
    if (deleteError) {
      toasts.addDanger(
        i18n.translate('xpack.securitySolution.eventFilters.deletionDialog.deleteFailure', {
          defaultMessage:
            'Unable to remove "{name}" from the Event Filters list. Reason: {message}',
          values: { name: eventFilter?.name, message: deleteError.message },
        })
      );
    }
  }, [deleteError, eventFilter?.name, toasts]);

  return (
    <EuiModal onClose={onCancel}>
      <EuiModalHeader data-test-subj="eventFilterDeleteModalHeader">
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.securitySolution.eventFilters.deletionDialog.title"
            defaultMessage="Remove event filter"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody data-test-subj="eventFilterDeleteModalBody">
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.securitySolution.eventFilters.deletionDialog.mainMessage"
              defaultMessage='You are removing event filter "{name}".'
              values={{ name: <b className="eui-textBreakWord">{eventFilter?.name}</b> }}
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.securitySolution.eventFilters.deletionDialog.subMessage"
              defaultMessage="This action cannot be undone. Are you sure you wish to continue?"
            />
          </p>
        </EuiText>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty
          onClick={onCancel}
          isDisabled={isDeleting}
          data-test-subj="eventFilterDeleteModalCancelButton"
        >
          <FormattedMessage
            id="xpack.securitySolution.eventFilters.deletionDialog.cancelButton"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>

        <EuiButton
          fill
          color="danger"
          onClick={onConfirm}
          isLoading={isDeleting}
          data-test-subj="eventFilterDeleteModalConfirmButton"
        >
          <FormattedMessage
            id="xpack.securitySolution.eventFilters.deletionDialog.confirmButton"
            defaultMessage="Remove event filter"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
});

EventFilterDeleteModal.displayName = 'EventFilterDeleteModal';
