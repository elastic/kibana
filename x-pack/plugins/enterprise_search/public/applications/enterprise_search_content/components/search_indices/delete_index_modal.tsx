/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiCallOut,
  EuiConfirmModal,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { ingestionMethodToText } from '../../utils/indices';

import { IndicesLogic } from './indices_logic';

export const DeleteIndexModal: React.FC = () => {
  const { closeDeleteModal, deleteIndex } = useActions(IndicesLogic);
  const {
    deleteModalIndexName: indexName,
    deleteModalIndexHasInProgressSyncs,
    deleteModalIngestionMethod: ingestionMethod,
    isDeleteModalVisible,
    isDeleteLoading,
    isFetchIndexDetailsLoading,
  } = useValues(IndicesLogic);

  const [inputIndexName, setInputIndexName] = useState('');
  useEffect(() => {
    setInputIndexName('');
  }, [isDeleteModalVisible, indexName]);

  return isDeleteModalVisible ? (
    <EuiConfirmModal
      title={i18n.translate('xpack.enterpriseSearch.content.searchIndices.deleteModal.title', {
        defaultMessage: 'Are you sure you want to delete {indexName}',
        values: { indexName },
      })}
      onCancel={() => {
        closeDeleteModal();
      }}
      onConfirm={() => {
        deleteIndex({ indexName });
      }}
      cancelButtonText={
        isDeleteLoading
          ? i18n.translate(
              'xpack.enterpriseSearch.content.searchIndices.deleteModal.closeButton.title',
              {
                defaultMessage: 'Close',
              }
            )
          : i18n.translate(
              'xpack.enterpriseSearch.content.searchIndices.deleteModal.cancelButton.title',
              {
                defaultMessage: 'Cancel',
              }
            )
      }
      confirmButtonText={i18n.translate(
        'xpack.enterpriseSearch.content.searchIndices.deleteModal.confirmButton.title',
        {
          defaultMessage: 'Delete index',
        }
      )}
      defaultFocusedButton="confirm"
      buttonColor="danger"
      confirmButtonDisabled={inputIndexName.trim() !== indexName}
      isLoading={isDeleteLoading || isFetchIndexDetailsLoading}
    >
      <p>
        {i18n.translate(
          'xpack.enterpriseSearch.content.searchIndices.deleteModal.delete.description',
          {
            defaultMessage:
              'Deleting this index will also delete all of its data and its {ingestionMethod} configuration. Any associated search applications will no longer be able to access any data stored in this index.',
            values: {
              ingestionMethod: ingestionMethodToText(ingestionMethod),
            },
          }
        )}
      </p>
      {deleteModalIndexHasInProgressSyncs && (
        <>
          <EuiCallOut
            color="warning"
            iconType="warning"
            title={i18n.translate(
              'xpack.enterpriseSearch.content.searchIndices.deleteModal.syncsWarning.title',
              {
                defaultMessage: 'Syncs in progress',
              }
            )}
          >
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.content.searchIndices.deleteModal.syncsWarning.description',
                {
                  defaultMessage:
                    'This index has in-progress syncs. Deleting the index without stopping these syncs may result in dangling sync job records or the index being re-created.',
                }
              )}
            </p>
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}
      <EuiText>
        <FormattedMessage
          id="xpack.enterpriseSearch.content.searchIndices.deleteModal.syncsWarning.indexNameDescription"
          defaultMessage="This action cannot be undone. Please type {indexName} to confirm."
          values={{
            indexName: (
              <strong>
                <EuiTextColor color="danger">{indexName}</EuiTextColor>
              </strong>
            ),
          }}
        />
      </EuiText>
      <EuiForm>
        <EuiFormRow
          label={i18n.translate(
            'xpack.enterpriseSearch.content.searchIndices.deleteModal.indexNameInput.label',
            {
              defaultMessage: 'Index name',
            }
          )}
        >
          <EuiFieldText
            data-test-subj="entSearchContent-indices-deleteModal-input"
            data-telemetry-id="entSearchContent-indices-deleteModal-input"
            onChange={(e) => setInputIndexName(e.target.value)}
            value={inputIndexName}
          />
        </EuiFormRow>
      </EuiForm>
    </EuiConfirmModal>
  ) : (
    <></>
  );
};
