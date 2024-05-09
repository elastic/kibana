/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, EuiFieldText, EuiForm, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AcknowledgedResponseBase } from '@elastic/elasticsearch/lib/api/types';
import { useMutation } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { useKibanaServices } from '../../hooks/use_kibana';

interface DeleteConnectorModalProps {
  closeDeleteModal: () => void;
  connectorId: string;
  connectorName: string;
  onSuccess?: () => void;
}

export const DeleteConnectorModal: React.FC<DeleteConnectorModalProps> = ({
  connectorId,
  connectorName,
  closeDeleteModal,
  onSuccess,
}) => {
  const { http } = useKibanaServices();
  const { isLoading, isSuccess, mutate } = useMutation({
    mutationFn: async () => {
      const result = await http.delete<AcknowledgedResponseBase>(
        `/internal/serverless_search/connectors/${connectorId}`
      );
      return result.acknowledged;
    },
  });

  useEffect(() => {
    if (isSuccess) {
      if (onSuccess) {
        onSuccess();
      }
      closeDeleteModal();
    }
  }, [closeDeleteModal, isSuccess, onSuccess]);

  const [inputConnectorName, setInputConnectorName] = useState('');

  return (
    <EuiConfirmModal
      title={i18n.translate('xpack.serverlessSearch.connectors.deleteModal.title', {
        defaultMessage: 'Are you sure you want to delete connector {connectorName}',
        values: { connectorName },
      })}
      onCancel={() => {
        closeDeleteModal();
      }}
      onConfirm={() => {
        mutate();
      }}
      cancelButtonText={
        isLoading
          ? i18n.translate('xpack.serverlessSearch.connectors.deleteModal.closeButton.title', {
              defaultMessage: 'Close',
            })
          : i18n.translate('xpack.serverlessSearch.connectors.deleteModal.cancelButton.title', {
              defaultMessage: 'Cancel',
            })
      }
      confirmButtonText={i18n.translate(
        'xpack.serverlessSearch.connectors.deleteModal.confirmButton.title',
        {
          defaultMessage: 'Delete index',
        }
      )}
      defaultFocusedButton="confirm"
      buttonColor="danger"
      confirmButtonDisabled={inputConnectorName.trim() !== connectorName}
      isLoading={isLoading}
    >
      <p>
        {i18n.translate(
          'xpack.serverlessSearch.connectors.deleteModal.syncsWarning.connectorNameDescription',
          {
            defaultMessage: 'This action cannot be undone. Please type {connectorName} to confirm.',
            values: { connectorName },
          }
        )}
      </p>
      <EuiForm>
        <EuiFormRow
          label={i18n.translate(
            'xpack.serverlessSearch.connectors.deleteModal.connectorNameInput.label',
            {
              defaultMessage: 'Connector name',
            }
          )}
        >
          <EuiFieldText
            data-test-subj="serverlessSearchDeleteConnectorModalFieldText"
            onChange={(e) => setInputConnectorName(e.target.value)}
            value={inputConnectorName}
          />
        </EuiFormRow>
      </EuiForm>
    </EuiConfirmModal>
  );
};
