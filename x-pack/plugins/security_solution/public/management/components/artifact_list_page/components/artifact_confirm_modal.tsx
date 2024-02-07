/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
} from '@elastic/eui';
import { AutoFocusButton } from '../../../../common/components/autofocus_button/autofocus_button';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';

export const ARTIFACT_CONFIRM_LABELS = Object.freeze({
  confirmModalTitle: (itemName: string): string =>
    i18n.translate('xpack.securitySolution.artifactListPage.confirmModalTitle', {
      defaultMessage: 'Confirm Trusted Application',
      values: { itemName },
    }),

  confirmModalInfo: i18n.translate('xpack.securitySolution.artifactListPage.confirmModalInfo', {
    defaultMessage:
      'Using a ‘*’ or a ‘?’ in the value and with the ‘IS’ operator can make the entry ineffective. Change the operator to ‘matches’ to ensure wildcards run properly. Select “cancel” to revise your entry, or “add” to continue with entry in its current state.',
  }),

  confirmModalSubmitButtonTitle: i18n.translate(
    'xpack.securitySolution.artifactListPage.confirmModalSubmitButtonTitle',
    { defaultMessage: 'Add' }
  ),

  confirmModalCancelButtonTitle: i18n.translate(
    'xpack.securitySolution.artifactListPage.confirmModalCancelButtonTitle',
    { defaultMessage: 'Cancel' }
  ),
});

interface ConfirmArtifactModalProps {
  title: string;
  body: string;
  confirmButton: string;
  cancelButton: string;
  onCancel: () => void;
  onSuccess: () => void;
  // labels: typeof ARTIFACT_CONFIRM_LABELS & typeof ARTIFACT_CONFIRM_ACTION_LABELS;
  'data-test-subj'?: string;
}

export const ArtifactConfirmModal = memo<ConfirmArtifactModalProps>(
  ({ title, body, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    /* const { confirmArtifactItem, isLoading: isDeleting } = useWithArtifactConfirmItem(
      apiClient,
      item,
      labels
    );

    const onConfirm = useCallback(() => {
      confirmArtifactItem(item).then(() => onSuccess());
    }, [confirmArtifactItem, item, onSuccess]);

    const handleOnCancel = useCallback(() => {
      if (!isDeleting) {
        onCancel();
      }
    }, [isDeleting, onCancel]);*/

    return (
      <EuiModal onClose={} data-test-subj={dataTestSubj}>
        <EuiModalHeader data-test-subj={getTestId('header')}>
          <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody data-test-subj={getTestId('body')}>
          <EuiText>
            <p>{body}</p>
          </EuiText>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={handleOnCancel} data-test-subj={getTestId('cancelButton')}>
            {cancelButton}
          </EuiButtonEmpty>

          <AutoFocusButton
            fill
            color="danger"
            onClick={onConfirm}
            data-test-subj={getTestId('submitButton')}
          >
            {confirmButton}
          </AutoFocusButton>
        </EuiModalFooter>
      </EuiModal>
    );
  }
);
ArtifactConfirmModal.displayName = 'ArtifactConfirmModal';
