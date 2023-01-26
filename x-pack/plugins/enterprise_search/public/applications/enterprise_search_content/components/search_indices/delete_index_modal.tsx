/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ingestionMethodToText } from '../../utils/indices';

import { IndicesLogic } from './indices_logic';

export const DeleteIndexModal: React.FC = () => {
  const { closeDeleteModal, deleteIndex } = useActions(IndicesLogic);
  const {
    deleteModalIndexName: indexName,
    deleteModalIngestionMethod: ingestionMethod,
    isDeleteModalVisible,
    isDeleteLoading,
  } = useValues(IndicesLogic);
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
      isLoading={isDeleteLoading}
    >
      <p>
        {i18n.translate(
          'xpack.enterpriseSearch.content.searchIndices.deleteModal.delete.description',
          {
            defaultMessage:
              'Deleting this index will also delete all of its data and its {ingestionMethod} configuration. Any associated search engines will no longer be able to access any data stored in this index.This can not be undone.',
            values: {
              ingestionMethod: ingestionMethodToText(ingestionMethod),
            },
          }
        )}
      </p>
    </EuiConfirmModal>
  ) : (
    <></>
  );
};
