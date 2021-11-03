/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
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
import { ModelItemFull } from './models_list';

interface DeleteModelsModalProps {
  models: ModelItemFull[];
  onClose: (deletionApproved?: boolean) => void;
}

export const DeleteModelsModal: FC<DeleteModelsModalProps> = ({ models, onClose }) => {
  const modelsWithPipelines = models
    .filter((model) => !!model.pipelines)
    .map((model) => model.model_id);

  return (
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
          onClick={onClose.bind(null, true)}
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
  );
};
