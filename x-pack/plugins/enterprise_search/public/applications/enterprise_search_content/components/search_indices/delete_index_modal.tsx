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

import { IndicesLogic } from './indices_logic';

export const DeleteIndexModal: React.FC = () => {
  const { closeDeleteModal, deleteIndex } = useActions(IndicesLogic);
  const { deleteModalIndexName: indexName, isDeleteModalVisible } = useValues(IndicesLogic);
  return isDeleteModalVisible ? (
    <EuiConfirmModal
      title={i18n.translate('xpack.enterpriseSearch.content.searchIndices.deleteModal.title', {
        defaultMessage: 'Delete index',
      })}
      onCancel={() => {
        closeDeleteModal();
      }}
      onConfirm={() => {
        deleteIndex({ indexName });
      }}
      cancelButtonText={i18n.translate(
        'xpack.enterpriseSearch.content.searchIndices.deleteModal.cancelButton.title',
        {
          defaultMessage: 'Cancel',
        }
      )}
      confirmButtonText={i18n.translate(
        'xpack.enterpriseSearch.content.searchIndices.deleteModal.confirmButton.title',
        {
          defaultMessage: 'Delete index',
        }
      )}
      defaultFocusedButton="confirm"
      buttonColor="danger"
    >
      <p>
        {i18n.translate(
          'xpack.enterpriseSearch.content.searchIndices.deleteModal.delete.description',
          {
            defaultMessage:
              'You are about to delete the index {indexName}. This will also delete any associated connector documents or crawlers.',
            values: {
              indexName,
            },
          }
        )}
      </p>
      <p>
        {i18n.translate(
          'xpack.enterpriseSearch.content.searchIndices.deleteModal.searchEngine.description',
          {
            defaultMessage:
              'Any associated search engines will no longer be able to access any data stored in this index.',
          }
        )}
      </p>
      <p>
        {i18n.translate(
          'xpack.enterpriseSearch.content.searchIndices.deleteModal.irrevokable.description',
          {
            defaultMessage:
              "You can't recover a deleted index, connector or crawler configuration. Make sure you have appropriate backups.",
          }
        )}
      </p>
    </EuiConfirmModal>
  ) : (
    <></>
  );
};
