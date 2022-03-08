/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { AutoFocusButton } from '../../../../common/components/autofocus_button/autofocus_button';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import {
  getPolicyIdsFromArtifact,
  isArtifactGlobal,
} from '../../../../../common/endpoint/service/artifacts';
import {
  ARTIFACT_DELETE_ACTION_LABELS,
  useWithArtifactDeleteItem,
} from '../hooks/use_with_artifact_delete_item';
import { ExceptionsListApiClient } from '../../../services/exceptions_list/exceptions_list_api_client';

export const ARTIFACT_DELETE_LABELS = Object.freeze({
  deleteModalTitle: (itemName: string): string =>
    i18n.translate('xpack.securitySolution.artifactListPage.deleteModalTitle', {
      defaultMessage: 'Delete {itemName}',
      values: { itemName },
    }),

  deleteModalImpactTitle: i18n.translate(
    'xpack.securitySolution.artifactListPage.deleteModalImpactTitle',
    {
      defaultMessage: 'Warning',
    }
  ),

  deleteModalImpactInfo: (item: ExceptionListItemSchema): string => {
    return i18n.translate('xpack.securitySolution.artifactListPage.deleteModalImpactInfo', {
      defaultMessage:
        'Deleting this entry will remove it from {count} associated {count, plural, one {policy} other {policies}}.',
      values: {
        count: isArtifactGlobal(item)
          ? i18n.translate('xpack.securitySolution.artifactListPage.deleteModalImpactInfoAll', {
              defaultMessage: 'all',
            })
          : getPolicyIdsFromArtifact(item).length,
      },
    });
  },

  deleteModalConfirmInfo: i18n.translate(
    'xpack.securitySolution.artifactListPage.deleteModalConfirmInfo',
    {
      defaultMessage: 'This action cannot be undone. Are you sure you wish to continue?',
    }
  ),

  deleteModalSubmitButtonTitle: i18n.translate(
    'xpack.securitySolution.artifactListPage.deleteModalSubmitButtonTitle',
    { defaultMessage: 'Delete' }
  ),

  deleteModalCancelButtonTitle: i18n.translate(
    'xpack.securitySolution.artifactListPage.deleteModalCancelButtonTitle',
    { defaultMessage: 'Cancel' }
  ),
});

interface DeleteArtifactModalProps {
  apiClient: ExceptionsListApiClient;
  item: ExceptionListItemSchema;
  onCancel: () => void;
  onSuccess: () => void;
  labels: typeof ARTIFACT_DELETE_LABELS & typeof ARTIFACT_DELETE_ACTION_LABELS;
  'data-test-subj'?: string;
}

export const ArtifactDeleteModal = memo<DeleteArtifactModalProps>(
  ({ apiClient, item, onCancel, onSuccess, 'data-test-subj': dataTestSubj, labels }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    const { deleteArtifactItem, isLoading: isDeleting } = useWithArtifactDeleteItem(
      apiClient,
      item,
      labels
    );

    const onConfirm = useCallback(() => {
      deleteArtifactItem(item).then(() => onSuccess());
    }, [deleteArtifactItem, item, onSuccess]);

    const handleOnCancel = useCallback(() => {
      if (!isDeleting) {
        onCancel();
      }
    }, [isDeleting, onCancel]);

    return (
      <EuiModal onClose={handleOnCancel} data-test-subj={dataTestSubj}>
        <EuiModalHeader data-test-subj={getTestId('header')}>
          <EuiModalHeaderTitle>{labels.deleteModalTitle(item.name)}</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody data-test-subj={getTestId('body')}>
          <EuiText>
            <EuiCallOut
              data-test-subj={getTestId('impactCallout')}
              title={labels.deleteModalImpactTitle}
              color="danger"
              iconType="alert"
            >
              <p data-test-subj={getTestId('impactCalloutInfo')}>
                {labels.deleteModalImpactInfo(item)}
              </p>
            </EuiCallOut>
            <EuiSpacer size="m" />
            <p>{labels.deleteModalConfirmInfo}</p>
          </EuiText>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty
            onClick={handleOnCancel}
            isDisabled={isDeleting}
            data-test-subj={getTestId('cancelButton')}
          >
            {labels.deleteModalCancelButtonTitle}
          </EuiButtonEmpty>

          <AutoFocusButton
            fill
            color="danger"
            onClick={onConfirm}
            isLoading={isDeleting}
            isDisabled={isDeleting}
            data-test-subj={getTestId('submitButton')}
          >
            {labels.deleteModalSubmitButtonTitle}
          </AutoFocusButton>
        </EuiModalFooter>
      </EuiModal>
    );
  }
);
ArtifactDeleteModal.displayName = 'ArtifactDeleteModal';
