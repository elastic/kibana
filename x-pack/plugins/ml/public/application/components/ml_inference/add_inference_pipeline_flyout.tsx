/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useMemo, useState } from 'react';

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
import { AddInferencePipelineSteps } from './types';
import { AddInferencePipelineFooter } from './components/add_inference_pipeline_footer';
import { AddInferencePipelineHorizontalSteps } from './components/add_inference_pipeline_horizontal_steps';
import { getInitialState, getModelType } from './state';
import { ConfigurePipeline } from './components/configure_pipeline';
import { AdvancedConfiguration } from './components/advanced_configuration';
import { TestPipeline } from './components/test_pipeline';
import { ReviewPipeline } from './components/review_and_create_pipeline';
import { useMlApiContext, useMlKibana } from '../../contexts/kibana';
import { getPipelineConfig } from './get_pipeline_config';
import {
  validateInferencePipelineConfigurationStep,
  validateInferencePipelineAdvancedStep,
} from './validation';
import type { MlInferenceState, InferenceModelTypes } from './types';

import './add_inference_pipeline_flyout.scss';

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
  const [step, setStep] = useState<AddInferencePipelineSteps>(
    AddInferencePipelineSteps.Configuration
  );
  const [pipelineNames, setPipelineNames] = useState<string[]>([]);

  const {
    trainedModels: { getAllIngestPipelines, createInferencePipeline },
  } = useMlApiContext();
  const {
    notifications: { toasts },
  } = useMlKibana();
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

  useEffect(() => {
    async function fetchPipelines() {
      let names: string[] = [];
      try {
        const results = await getAllIngestPipelines();
        names = Object.keys(results);
        setPipelineNames(names);
      } catch (e) {
        toasts.danger({
          title: i18n.translate(
            'xpack.ml.trainedModels.content.indices.pipelines.fetchIngestPipelinesError',
            {
              defaultMessage: 'Unable to fetch ingest pipelines.',
            }
          ),
          body: e.message,
          toastLifeTimeMs: 5000,
        });
      }
    }

    fetchPipelines();
  }, [getAllIngestPipelines, toasts]);

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
        />
        <EuiSpacer size="m" />
        {step === AddInferencePipelineSteps.Configuration && (
          <ConfigurePipeline
            handlePipelineConfigUpdate={handleConfigUpdate}
            pipelineName={formState.pipelineName}
            pipelineNameError={pipelineNameError}
            pipelineDescription={formState.pipelineDescription}
            modelId={model.model_id}
            targetField={formState.targetField}
            targetFieldError={targetFieldError}
          />
        )}
        {step === AddInferencePipelineSteps.Advanced && model && (
          <AdvancedConfiguration
            handleAdvancedConfigUpdate={handleConfigUpdate}
            inferenceConfig={formState.inferenceConfig}
            inferenceConfigError={inferenceConfigError}
            modelInferenceConfig={model.inference_config}
            fieldMapError={fieldMapError}
            modelInputFields={model.input ?? []}
            modelType={modelType as InferenceModelTypes}
          />
        )}
        {step === AddInferencePipelineSteps.Test && (
          <TestPipeline sourceIndex={sourceIndex} state={formState} />
        )}
        {step === AddInferencePipelineSteps.Create && (
          <ReviewPipeline
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
