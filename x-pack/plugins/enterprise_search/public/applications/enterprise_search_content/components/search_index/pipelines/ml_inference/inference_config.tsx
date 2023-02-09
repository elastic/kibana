/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import {
  getMlModelTypesForModelConfig,
  SUPPORTED_PYTORCH_TASKS,
} from '../../../../../../../common/ml_inference_pipeline';
import { getMLType } from '../../../shared/ml_inference/utils';

import { MLInferenceLogic } from './ml_inference_logic';
import { ZeroShotClassificationInferenceConfiguration } from './zero_shot_inference_configuration';

export const InferenceConfiguration: React.FC = () => {
  const {
    addInferencePipelineModal: { configuration },
    selectedMLModel,
  } = useValues(MLInferenceLogic);
  if (!selectedMLModel || configuration.existingPipeline) return null;
  const modelType = getMLType(getMlModelTypesForModelConfig(selectedMLModel));
  switch (modelType) {
    case SUPPORTED_PYTORCH_TASKS.ZERO_SHOT_CLASSIFICATION:
      return (
        <InferenceConfigurationWrapper>
          <ZeroShotClassificationInferenceConfiguration />
        </InferenceConfigurationWrapper>
      );
    default:
      return null;
  }
};

const InferenceConfigurationWrapper: React.FC = ({ children }) => {
  return (
    <>
      <EuiSpacer />
      <EuiText>
        <h4>
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.inference.title',
            { defaultMessage: 'Inference Configuration' }
          )}
        </h4>
      </EuiText>
      {children}
    </>
  );
};
