/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
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
import { useEventFiltersSelector } from '../hooks';
import { isDeletionInProgress } from '../../store/selector';

export interface EventFilterDeleteModalProps {
  onCancel: () => void;
  onDone: () => void;
}

export const EventFilterDeleteModal = memo<EventFilterDeleteModalProps>(({ onCancel, onDone }) => {
  const isDeleting = useEventFiltersSelector(isDeletionInProgress);

  const onConfirm = useCallback(() => {}, []);

  return (
    <EuiModal onClose={onCancel}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.securitySolution.eventFilters.deletionDialog.title"
            defaultMessage="Remove event filter"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.securitySolution.eventFilters.deletionDialog.mainMessage"
              defaultMessage='You are removing event filter "{name}".'
              values={{ name: <strong>{'TODO: name goes here'}</strong> }}
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
          data-test-subj="modalCancelButton"
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
          data-test-subj="modalConfirmButton"
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
