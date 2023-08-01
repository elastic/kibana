/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo, useState } from 'react';

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { ModelItem } from '../../model_management/models_list';
import type { AddInferencePipelineSteps } from './types';
import { ADD_INFERENCE_PIPELINE_STEPS } from './constants';
import { AddInferencePipelineFooter } from './components/add_inference_pipeline_footer';
import { AddInferencePipelineHorizontalSteps } from './components/add_inference_pipeline_horizontal_steps';
import { getInitialState, getModelType } from './state';
import { PipelineDetails } from './components/pipeline_details';
import { ProcessorConfiguration } from './components/processor_configuration';
import { OnFailureConfiguration } from './components/on_failure_configuration';
import { TestPipeline } from './components/test_pipeline';
import { ReviewAndCreatePipeline } from './components/review_and_create_pipeline';
import { useMlApiContext } from '../../contexts/kibana';
import { getPipelineConfig } from './get_pipeline_config';
import {
  validateInferencePipelineConfigurationStep,
  validateInferencePipelineAdvancedStep,
} from './validation';
import type { MlInferenceState, InferenceModelTypes } from './types';
import { useFetchPipelines } from './hooks/use_fetch_pipelines';

export interface AddInferencePipelineFlyoutProps {
  onClose: () => void;
  model: ModelItem;
}

export const AddInferencePipelineFlyout: FC<AddInferencePipelineFlyoutProps> = ({
  onClose,
  model,
}) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialState = useMemo(() => getInitialState(model), [model.model_id]);
  const [formState, setFormState] = useState<MlInferenceState>(initialState);
  const [step, setStep] = useState<AddInferencePipelineSteps>(ADD_INFERENCE_PIPELINE_STEPS.DETAILS);

  const {
    trainedModels: { createInferencePipeline },
  } = useMlApiContext();

  const modelType = getModelType(model);

  const createPipeline = async () => {
    setFormState({ ...formState, creatingPipeline: true });
    try {
      await createInferencePipeline(formState.pipelineName, getPipelineConfig(formState));
      setFormState({ ...formState, pipelineCreated: true, creatingPipeline: false });
    } catch (e) {
      setFormState({ ...formState, creatingPipeline: false, pipelineError: e.message });
    }
  };

  const pipelineNames = useFetchPipelines();

  const handleConfigUpdate = (configUpdate: Partial<MlInferenceState>) => {
    setFormState({ ...formState, ...configUpdate });
  };

  const { pipelineName: pipelineNameError, targetField: targetFieldError } = useMemo(() => {
    const errors = validateInferencePipelineConfigurationStep(
      formState.pipelineName,
      pipelineNames
    );
    return errors;
  }, [pipelineNames, formState.pipelineName]);

  const { inferenceConfig: inferenceConfigError, fieldMap: fieldMapError } = useMemo(() => {
    const errors = validateInferencePipelineAdvancedStep(
      model.input?.field_names ?? [],
      formState.fieldMap,
      formState.inferenceConfig
    );
    return errors;
    // Model input fields will not change unless the model is changed. Therefore, we can just check the model_id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState.fieldMap, formState.inferenceConfig, model.model_id]);

  const sourceIndex = useMemo(
    () =>
      Array.isArray(model.metadata?.analytics_config.source.index)
        ? model.metadata?.analytics_config.source.index.join()
        : model.metadata?.analytics_config.source.index,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [model?.model_id]
  );

  return (
    <EuiFlyout onClose={onClose} className="mlTrainedModelsInferencePipelineFlyout" size="l">
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h3>
            {i18n.translate(
              'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.title',
              {
                defaultMessage: 'Deploy analytics model',
              }
            )}
          </h3>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <AddInferencePipelineHorizontalSteps
          step={step}
          setStep={setStep}
          isConfigureStepValid={pipelineNameError === undefined && targetFieldError === undefined}
          isPipelineDataValid={
            pipelineNameError === undefined &&
            inferenceConfigError === undefined &&
            fieldMapError === undefined
          }
          isOnFailureDataValid={true} // TODO: add validation
        />
        <EuiSpacer size="m" />
        {step === ADD_INFERENCE_PIPELINE_STEPS.DETAILS && (
          <PipelineDetails
            handlePipelineConfigUpdate={handleConfigUpdate}
            pipelineName={formState.pipelineName}
            pipelineNameError={pipelineNameError}
            pipelineDescription={formState.pipelineDescription}
            modelId={model.model_id}
            targetField={formState.targetField}
            targetFieldError={targetFieldError}
          />
        )}
        {step === ADD_INFERENCE_PIPELINE_STEPS.CONFIGURE_PROCESSOR && model && (
          <ProcessorConfiguration
            fieldMap={formState.fieldMap}
            handleAdvancedConfigUpdate={handleConfigUpdate}
            inferenceConfig={formState.inferenceConfig}
            inferenceConfigError={inferenceConfigError}
            modelInferenceConfig={model.inference_config}
            fieldMapError={fieldMapError}
            modelInputFields={model.input ?? []}
            modelType={modelType as InferenceModelTypes}
          />
        )}
        {step === ADD_INFERENCE_PIPELINE_STEPS.ON_FAILURE && (
          <OnFailureConfiguration
            ignoreFailure={formState.ignoreFailure}
            handleAdvancedConfigUpdate={handleConfigUpdate}
            onFailure={formState.onFailure}
          />
        )}
        {step === ADD_INFERENCE_PIPELINE_STEPS.TEST && (
          <TestPipeline sourceIndex={sourceIndex} state={formState} />
        )}
        {step === ADD_INFERENCE_PIPELINE_STEPS.CREATE && (
          <ReviewAndCreatePipeline
            inferencePipeline={getPipelineConfig(formState)}
            modelType={modelType}
            pipelineName={formState.pipelineName}
            pipelineCreated={formState.pipelineCreated}
            pipelineError={formState.pipelineError}
          />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter className="mlTrainedModelsInferencePipelineFlyoutFooter">
        <AddInferencePipelineFooter
          onClose={onClose}
          onCreate={createPipeline}
          step={step}
          setStep={setStep}
          isConfigureStepValid={pipelineNameError === undefined && targetFieldError === undefined}
          isPipelineDataValid={inferenceConfigError === undefined && fieldMapError === undefined}
          pipelineCreated={formState.pipelineCreated}
          creatingPipeline={formState.creatingPipeline}
        />
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
