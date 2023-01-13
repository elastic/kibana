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

import { CANCEL_BUTTON_LABEL } from '../../../shared/constants';

import { EnginesListLogic } from './engines_list_logic';

export const DeleteEngineModal: React.FC = () => {
  const { closeDeleteEngineModal, deleteEngine } = useActions(EnginesListLogic);
  const {
    deleteModalEngineName: engineName,
    isDeleteModalVisible,
    isDeleteLoading,
  } = useValues(EnginesListLogic);

  if (isDeleteModalVisible) {
    return (
      <EuiConfirmModal
        title={i18n.translate('xpack.enterpriseSearch.content.engineList.deleteEngineModal.title', {
          defaultMessage: 'Permanently delete this engine?',
        })}
        onCancel={closeDeleteEngineModal}
        onConfirm={() => {
          deleteEngine({ engineName });
        }}
        cancelButtonText={CANCEL_BUTTON_LABEL}
        confirmButtonText={i18n.translate(
          'xpack.enterpriseSearch.content.engineList.deleteEngineModal.confirmButton.title',
          {
            defaultMessage: 'Yes, delete this engine ',
          }
        )}
        buttonColor="danger"
        isLoading={isDeleteLoading}
      >
        <p>
          {i18n.translate(
            'xpack.enterpriseSearch.content.engineList.deleteEngineModal.delete.description',
            {
              defaultMessage:
                'Deleting your engine is not a reversible action. Your indices will not be affected. ',
            }
          )}
        </p>
      </EuiConfirmModal>
    );
  } else {
    return <></>;
  }
};
