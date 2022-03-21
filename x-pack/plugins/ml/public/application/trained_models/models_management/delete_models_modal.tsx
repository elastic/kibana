/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalFooter,
  EuiButtonEmpty,
  EuiButton,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useTrainedModelsApiService } from '../../services/ml_api_service/trained_models';
import { useToastNotificationService } from '../../services/toast_notification_service';
import { DeleteSpaceAwareItemCheckModal } from '../../components/delete_space_aware_item_check_modal';

interface DeleteModelsModalProps {
  modelIds: string[];
  onClose: (refreshList?: boolean) => void;
}

export const DeleteModelsModal: FC<DeleteModelsModalProps> = ({ modelIds, onClose }) => {
  const trainedModelsApiService = useTrainedModelsApiService();
  const { displayErrorToast, displaySuccessToast } = useToastNotificationService();

  const [canDeleteModel, setCanDeleteModel] = useState(false);

  const deleteModels = useCallback(async () => {
    try {
      await Promise.all(
        modelIds.map((modelId) => trainedModelsApiService.deleteTrainedModel(modelId))
      );
      displaySuccessToast(
        i18n.translate('xpack.ml.trainedModels.modelsList.successfullyDeletedMessage', {
          defaultMessage:
            '{modelsCount, plural, one {Model {modelIds}} other {# models}} {modelsCount, plural, one {has} other {have}} been successfully deleted',
          values: {
            modelsCount: modelIds.length,
            modelIds: modelIds.join(', '),
          },
        })
      );
    } catch (error) {
      displayErrorToast(
        error,
        i18n.translate('xpack.ml.trainedModels.modelsList.fetchDeletionErrorMessage', {
          defaultMessage: '{modelsCount, plural, one {Model} other {Models}} deletion failed',
          values: {
            modelsCount: modelIds.length,
          },
        })
      );
    }
    onClose(true);
  }, [modelIds, trainedModelsApiService]);

  return canDeleteModel ? (
    <EuiModal
      onClose={onClose.bind(null, false)}
      initialFocus="[name=cancelModelDeletion]"
      data-test-subj="mlModelsDeleteModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.deleteModal.header"
            defaultMessage="Delete {modelsCount, plural, one {{modelId}} other {# models}}?"
            values={{
              modelId: modelIds[0],
              modelsCount: modelIds.length,
            }}
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose.bind(null, false)} name="cancelModelDeletion">
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.deleteModal.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>

        <EuiButton
          onClick={deleteModels.bind(null)}
          fill
          color="danger"
          data-test-subj="mlModelsDeleteModalConfirmButton"
        >
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.deleteModal.deleteButtonLabel"
            defaultMessage="Delete"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  ) : (
    <DeleteSpaceAwareItemCheckModal
      ids={modelIds}
      jobType="trained-model"
      canDeleteCallback={setCanDeleteModel.bind(null, true)}
      onCloseCallback={onClose.bind(null, true)}
      refreshJobsCallback={() => {}}
      hasManagedJob={false}
    />
  );
};
