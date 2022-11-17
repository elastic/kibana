/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import {
  getMlModelTypesForModelConfig,
  SUPPORTED_PYTORCH_TASKS,
} from '../../../../../../../common/ml_inference_pipeline';
import { TrainedModel } from '../../../../api/ml_models/ml_trained_models_logic';
import { getMLType } from '../../../shared/ml_inference/utils';

export interface TargetFieldHelpTextProps {
  model?: TrainedModel;
  pipelineName: string;
  targetField: string;
}

export const TargetFieldHelpText: React.FC<TargetFieldHelpTextProps> = ({
  pipelineName,
  targetField,
  model,
}) => {
  const baseText =
    targetField.length > 0
      ? i18n.translate(
          'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.targetField.helpText.userProvided',
          {
            defaultMessage:
              'This names the field that holds the inference result. It will be prefixed with "ml.inference", ml.inference.{targetField}',
            values: {
              targetField,
            },
          }
        )
      : i18n.translate(
          'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.targetField.helpText.default',
          {
            defaultMessage:
              'This names the field that holds the inference result. It will be prefixed with "ml.inference", if not set it will be defaulted to "ml.inference.{pipelineName}"',
            values: {
              pipelineName: pipelineName.length > 0 ? pipelineName : '<Pipeline Name>',
            },
          }
        );
  const modelType = model ? getMLType(getMlModelTypesForModelConfig(model)) : '';
  if (modelType === SUPPORTED_PYTORCH_TASKS.TEXT_CLASSIFICATION) {
    return (
      <EuiText size="xs">
        <p>{baseText}</p>
        <p>
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.targetField.helpText.textClassificationModel',
            {
              defaultMessage:
                'Additionally the predicted_value will be copied to "{fieldName}", if the prediction_probability is greater than 0.5.',
              values: {
                fieldName:
                  targetField.length > 0
                    ? targetField
                    : pipelineName.length > 0
                    ? pipelineName
                    : '<Pipeline Name>',
              },
            }
          )}
        </p>
      </EuiText>
    );
  }
  if (modelType === SUPPORTED_PYTORCH_TASKS.TEXT_EMBEDDING) {
    return (
      <EuiText size="xs">
        <p>{baseText}</p>
        <p>
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.targetField.helpText.textEmbeddingModel',
            {
              defaultMessage: 'Additionally the predicted_value will be copied to "{fieldName}"',
              values: {
                fieldName:
                  targetField.length > 0
                    ? targetField
                    : pipelineName.length > 0
                    ? pipelineName
                    : '<Pipeline Name>',
              },
            }
          )}
        </p>
      </EuiText>
    );
  }
  return <EuiText size="xs">{baseText}</EuiText>;
};
