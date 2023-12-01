/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import React, { FC, useMemo, useEffect } from 'react';
import { BehaviorSubject } from 'rxjs';

import { TRAINED_MODEL_TYPE, SUPPORTED_PYTORCH_TASKS } from '@kbn/ml-trained-models-utils';
import useObservable from 'react-use/lib/useObservable';
import { NerInference } from './models/ner';
import { QuestionAnsweringInference } from './models/question_answering';

import {
  TextClassificationInference,
  FillMaskInference,
  ZeroShotClassificationInference,
  LangIdentInference,
} from './models/text_classification';

import { TextEmbeddingInference } from './models/text_embedding';

import { useMlApiContext } from '../../contexts/kibana';
import { useTestTrainedModelsContext } from './test_trained_models_context';
import { InferenceInputForm } from './models/inference_input_form';
import { InferrerType } from './models';
import { INPUT_TYPE } from './models/inference_base';
import { TextExpansionInference } from './models/text_expansion';
import { type InferecePipelineCreationState } from '../create_pipeline_for_model/state';
import { getInferencePropertiesFromPipelineConfig } from '../create_pipeline_for_model/get_inference_properties_from_pipeline_config';

interface Props {
  model: estypes.MlTrainedModelConfig;
  inputType: INPUT_TYPE;
  deploymentId: string;
  handlePipelineConfigUpdate?: (configUpdate: Partial<InferecePipelineCreationState>) => void;
  externalPipelineConfig?: estypes.IngestPipeline;
}

const DEFAULT_PIPELINE_OBS = new BehaviorSubject({});

export const SelectedModel: FC<Props> = ({
  model,
  inputType,
  deploymentId,
  handlePipelineConfigUpdate,
  externalPipelineConfig,
}) => {
  const { trainedModels } = useMlApiContext();
  const {
    currentContext: { createPipelineFlyoutOpen, pipelineConfig },
    setCurrentContext,
  } = useTestTrainedModelsContext();
  const pipeline = (createPipelineFlyoutOpen && pipelineConfig) || undefined;

  const inferrer = useMemo<InferrerType | undefined>(() => {
    const taskType = Object.keys(model.inference_config ?? {})[0];
    let tempInferrer;

    if (model.model_type === TRAINED_MODEL_TYPE.PYTORCH) {
      switch (taskType) {
        case SUPPORTED_PYTORCH_TASKS.NER:
          tempInferrer = new NerInference(trainedModels, model, inputType, deploymentId);
          break;
        case SUPPORTED_PYTORCH_TASKS.TEXT_CLASSIFICATION:
          tempInferrer = new TextClassificationInference(
            trainedModels,
            model,
            inputType,
            deploymentId
          );
          break;
        case SUPPORTED_PYTORCH_TASKS.ZERO_SHOT_CLASSIFICATION:
          tempInferrer = new ZeroShotClassificationInference(
            trainedModels,
            model,
            inputType,
            deploymentId
          );
          break;
        case SUPPORTED_PYTORCH_TASKS.TEXT_EMBEDDING:
          tempInferrer = new TextEmbeddingInference(trainedModels, model, inputType, deploymentId);
          break;
        case SUPPORTED_PYTORCH_TASKS.FILL_MASK:
          tempInferrer = new FillMaskInference(trainedModels, model, inputType, deploymentId);
          break;
        case SUPPORTED_PYTORCH_TASKS.QUESTION_ANSWERING:
          tempInferrer = new QuestionAnsweringInference(
            trainedModels,
            model,
            inputType,
            deploymentId
          );
          break;
        case SUPPORTED_PYTORCH_TASKS.TEXT_EXPANSION:
          tempInferrer = new TextExpansionInference(trainedModels, model, inputType, deploymentId);
          break;
        default:
          break;
      }
    } else if (model.model_type === TRAINED_MODEL_TYPE.LANG_IDENT) {
      tempInferrer = new LangIdentInference(trainedModels, model, inputType, deploymentId);
    }
    if (tempInferrer) {
      tempInferrer.setSwitchtoCreationMode(setCurrentContext);
    }
    return tempInferrer;
  }, [inputType, model, trainedModels, deploymentId, setCurrentContext]);

  const updatedPipeline = useObservable(
    inferrer?.getPipeline$() ?? DEFAULT_PIPELINE_OBS,
    inferrer?.getPipeline() ?? {}
  );

  useEffect(() => {
    if (handlePipelineConfigUpdate && updatedPipeline && pipeline) {
      handlePipelineConfigUpdate({ initialPipelineConfig: { ...pipeline, ...updatedPipeline } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updatedPipeline]);

  useEffect(() => {
    const type = Object.keys(model.inference_config ?? {})[0];
    if (inferrer && externalPipelineConfig) {
      const {
        inputField,
        labels,
        multi_label: multiLabel,
        question,
      } = getInferencePropertiesFromPipelineConfig(type, externalPipelineConfig);

      inferrer.setInputField(inputField);
      if (
        type === SUPPORTED_PYTORCH_TASKS.ZERO_SHOT_CLASSIFICATION &&
        inferrer instanceof ZeroShotClassificationInference
      ) {
        inferrer.setLabelsText(Array.isArray(labels) ? labels.join(',') : labels);
        inferrer.setMultiLabel(Boolean(multiLabel));
      } else if (
        type === SUPPORTED_PYTORCH_TASKS.QUESTION_ANSWERING &&
        inferrer instanceof QuestionAnsweringInference
      ) {
        inferrer.setQuestionText(question);
      }
    }

    return () => {
      inferrer?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inferrer, model.model_id]);

  if (inferrer !== undefined) {
    return <InferenceInputForm inferrer={inferrer} inputType={inputType} />;
  }

  return null;
};
