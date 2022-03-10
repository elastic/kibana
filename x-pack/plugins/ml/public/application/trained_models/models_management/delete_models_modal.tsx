/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButtonEmpty,
  EuiButton,
  EuiCallOut,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ModelItemFull } from './models_list';
import { useTrainedModelsApiService } from '../../services/ml_api_service/trained_models';
import { useToastNotificationService } from '../../services/toast_notification_service';
import { DeleteSpaceAwareItemCheckModal } from '../../components/delete_space_aware_item_check_modal';

interface DeleteModelsModalProps {
  models: ModelItemFull[];
  onClose: (refreshList?: boolean) => void;
}

export const DeleteModelsModal: FC<DeleteModelsModalProps> = ({ models, onClose }) => {
  const trainedModelsApiService = useTrainedModelsApiService();
  const { displayErrorToast, displaySuccessToast } = useToastNotificationService();

  const [canDeleteModel, setCanDeleteModel] = useState(false);

  const modelsWithPipelines = useMemo(
    () => models.filter((model) => !!model.pipelines).map((model) => model.model_id),
    [models]
  );

  const deleteModels = useCallback(async () => {
    const modelsToDeleteIds = models.map((model) => model.model_id);

    try {
      await Promise.all(
        modelsToDeleteIds.map((modelId) => trainedModelsApiService.deleteTrainedModel(modelId))
      );
      displaySuccessToast(
        i18n.translate('xpack.ml.trainedModels.modelsList.successfullyDeletedMessage', {
          defaultMessage:
            '{modelsCount, plural, one {Model {modelsToDeleteIds}} other {# models}} {modelsCount, plural, one {has} other {have}} been successfully deleted',
          values: {
            modelsCount: modelsToDeleteIds.length,
            modelsToDeleteIds: modelsToDeleteIds.join(', '),
          },
        })
      );
    } catch (error) {
      displayErrorToast(
        error,
        i18n.translate('xpack.ml.trainedModels.modelsList.fetchDeletionErrorMessage', {
          defaultMessage: '{modelsCount, plural, one {Model} other {Models}} deletion failed',
          values: {
            modelsCount: modelsToDeleteIds.length,
          },
        })
      );
    }
    onClose(true);
  }, [models, trainedModelsApiService]);

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
              modelId: models[0].model_id,
              modelsCount: models.length,
            }}
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        {modelsWithPipelines.length > 0 && (
          <EuiCallOut
            data-test-subj="modelsWithPipelinesWarning"
            color={'danger'}
            iconType={'alert'}
            size="s"
          >
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.deleteModal.modelsWithPipelinesWarningMessage"
              defaultMessage="{modelsWithPipelinesCount, plural, one{Model} other {Models}} {modelsWithPipelines} {modelsWithPipelinesCount, plural, one{has} other {have}} associated pipelines!"
              values={{
                modelsWithPipelinesCount: modelsWithPipelines.length,
                modelsWithPipelines: modelsWithPipelines.join(', '),
              }}
            />
          </EuiCallOut>
        )}
      </EuiModalBody>

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
      ids={models.map(({ model_id: id }) => id)}
      jobType="trained-model"
      canDeleteCallback={setCanDeleteModel.bind(null, true)}
      onCloseCallback={onClose.bind(null, true)}
      refreshJobsCallback={() => {}}
      hasManagedJob={false}
    />
  );
};
