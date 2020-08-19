/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiOverlayMask,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButtonEmpty,
  EuiButton,
  EuiSpacer,
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
    <EuiOverlayMask>
      <EuiModal onClose={onClose.bind(null, false)} initialFocus="[name=cancelModelDeletion]">
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <FormattedMessage
              id="xpack.ml.inference.modelsList.deleteModal.header"
              defaultMessage="Delete {modelsCount, plural, one {{modelId}} other {# models}}"
              values={{
                modelId: models[0].model_id,
                modelsCount: models.length,
              }}
            />
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <FormattedMessage
            id="xpack.ml.inference.modelsList.deleteModal.warningMessage"
            defaultMessage="Are you sure you want to delete {modelsCount, plural, one{this model} other {these models}}?"
            values={{ modelsCount: models.length }}
          />
          <EuiSpacer size="m" />
          {modelsWithPipelines.length > 0 && (
            <EuiCallOut
              data-test-subj="modelsWithPipelinesWarning"
              color={'danger'}
              iconType={'alert'}
              size="s"
            >
              <FormattedMessage
                id="xpack.ml.inference.modelsList.deleteModal.modelsWithPipelinesWarningMessage"
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
              id="xpack.ml.inference.modelsList.deleteModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>

          <EuiButton onClick={onClose.bind(null, true)} fill color="danger">
            <FormattedMessage
              id="xpack.ml.inference.modelsList.deleteModal.deleteButtonLabel"
              defaultMessage="Delete"
            />
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
