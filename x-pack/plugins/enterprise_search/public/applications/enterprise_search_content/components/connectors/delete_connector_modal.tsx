/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiCheckbox,
  EuiConfirmModal,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { ConnectorsLogic } from './connectors_logic';

export const DeleteConnectorModal: React.FC = () => {
  const { closeDeleteModal } = useActions(ConnectorsLogic);
  const {
    isDeleteModalVisible,
    deleteModalConnectorName: connectorName,
    deleteModalIndexName,
  } = useValues(ConnectorsLogic);

  const [inputConnectorName, setInputConnectorName] = useState('');
  const [shouldDeleteIndex, setShouldDeleteIndex] = useState(false);

  useEffect(() => {
    setShouldDeleteIndex(false);
    setInputConnectorName('');
  }, [isDeleteModalVisible]);

  return isDeleteModalVisible ? (
    <EuiConfirmModal
      title={i18n.translate('xpack.enterpriseSearch.content.connectors.deleteModal.title', {
        defaultMessage: 'Delete {connectorCount} connector?',
        values: { connectorCount: 1 },
      })}
      onCancel={() => {
        closeDeleteModal();
      }}
      onConfirm={() => {
        // TODO delete endpoint
      }}
      cancelButtonText={
        false
          ? i18n.translate(
              'xpack.enterpriseSearch.content.connectors.deleteModal.closeButton.title',
              {
                defaultMessage: 'Close',
              }
            )
          : i18n.translate(
              'xpack.enterpriseSearch.content.connectors.deleteModal.cancelButton.title',
              {
                defaultMessage: 'Cancel',
              }
            )
      }
      confirmButtonText={i18n.translate(
        'xpack.enterpriseSearch.content.connectors.deleteModal.confirmButton.title',
        {
          defaultMessage: 'Delete index',
        }
      )}
      defaultFocusedButton="confirm"
      buttonColor="danger"
      confirmButtonDisabled={inputConnectorName.trim() !== connectorName}
      isLoading={false}
    >
      <p>
        {i18n.translate(
          'xpack.enterpriseSearch.content.connectors.deleteModal.delete.description',
          {
            defaultMessage: 'You are about to delete this connector:',
          }
        )}
      </p>
      <p>
        <ul>
          <li>
            <FormattedMessage
              id="xpack.enterpriseSearch.deleteConnectorModal.li.myconnectornameRelatedIndexLabel"
              defaultMessage="{connectorName} (Related index: {deleteModalIndexName} )"
              values={{
                connectorName,
                deleteModalIndexName: deleteModalIndexName || '-',
              }}
            />
          </li>
        </ul>
      </p>
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.enterpriseSearch.content.connectors.deleteModal.syncsWarning.indexNameDescription"
            defaultMessage="This action cannot be undone. Please type {connectorName} to confirm."
            values={{
              connectorName: (
                <EuiText color="danger" grow={false}>
                  {connectorName}
                </EuiText>
              ),
            }}
          />
        </p>
      </EuiText>
      <EuiSpacer />
      {deleteModalIndexName && (
        <>
          <EuiCheckbox
            id="delete-related-index"
            label={i18n.translate(
              'xpack.enterpriseSearch.deleteConnectorModal.euiCheckbox.deleteAlsoRelatedIndexLabel',
              { defaultMessage: 'Delete also related index' }
            )}
            checked={shouldDeleteIndex}
            onChange={() => setShouldDeleteIndex(!shouldDeleteIndex)}
          />
          <EuiSpacer />
        </>
      )}
      <EuiForm>
        <EuiFormRow
          label={i18n.translate(
            'xpack.enterpriseSearch.content.connectors.deleteModal.indexNameInput.label',
            {
              defaultMessage: 'Connector name',
            }
          )}
        >
          <EuiFieldText
            onChange={(e) => setInputConnectorName(e.target.value)}
            value={inputConnectorName}
          />
        </EuiFormRow>
      </EuiForm>
    </EuiConfirmModal>
  ) : (
    <></>
  );
};
