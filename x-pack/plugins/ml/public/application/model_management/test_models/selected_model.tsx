/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { FC } from 'react';
import React, { useMemo, useEffect } from 'react';
import { cloneDeep } from 'lodash';

import { TRAINED_MODEL_TYPE, SUPPORTED_PYTORCH_TASKS } from '@kbn/ml-trained-models-utils';
import { NerInference } from './models/ner';
import { QuestionAnsweringInference } from './models/question_answering';

import {
  TextClassificationInference,
  FillMaskInference,
  ZeroShotClassificationInference,
  LangIdentInference,
} from './models/text_classification';

import { TextEmbeddingInference } from './models/text_embedding';

import { useMlApi } from '../../contexts/kibana';
import { type TestTrainedModelsContextType } from './test_trained_models_context';
import { InferenceInputForm } from './models/inference_input_form';
import type { InferrerType } from './models';
import type { INPUT_TYPE } from './models/inference_base';
import { TextExpansionInference } from './models/text_expansion';
import { type InferecePipelineCreationState } from '../create_pipeline_for_model/state';
import {
  getInferencePropertiesFromPipelineConfig,
  isMlIngestInferenceProcessor,
  isMlInferencePipelineInferenceConfig,
} from '../create_pipeline_for_model/get_inference_properties_from_pipeline_config';

interface Props {
  model: estypes.MlTrainedModelConfig;
  inputType: INPUT_TYPE;
  deploymentId: string;
  handlePipelineConfigUpdate?: (configUpdate: Partial<InferecePipelineCreationState>) => void;
  externalPipelineConfig?: estypes.IngestPipeline;
  setCurrentContext?: React.Dispatch<TestTrainedModelsContextType>;
}

export const SelectedModel: FC<Props> = ({
  model,
  inputType,
  deploymentId,
  handlePipelineConfigUpdate,
  externalPipelineConfig,
  setCurrentContext,
}) => {
  const { trainedModels } = useMlApi();

  const inferrer = useMemo<InferrerType | undefined>(() => {
    const taskType = Object.keys(model.inference_config ?? {})[0];
    let tempInferrer: InferrerType | undefined;
    const pipelineConfigValues = externalPipelineConfig
      ? getInferencePropertiesFromPipelineConfig(taskType, externalPipelineConfig)
      : null;

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
          if (pipelineConfigValues) {
            const { labels, multi_label: multiLabel } = pipelineConfigValues;
            if (labels && multiLabel !== undefined) {
              tempInferrer.setLabelsText(Array.isArray(labels) ? labels.join(',') : labels);
              tempInferrer.setMultiLabel(Boolean(multiLabel));
            }
          }
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
          if (pipelineConfigValues?.question) {
            tempInferrer.setQuestionText(pipelineConfigValues.question);
          }
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
      if (pipelineConfigValues) {
        tempInferrer.setInputField(pipelineConfigValues.inputField);
      }
      if (externalPipelineConfig === undefined) {
        tempInferrer.setSwitchtoCreationMode(() => {
          if (tempInferrer && setCurrentContext) {
            setCurrentContext({
              pipelineConfig: tempInferrer.getPipeline(),
              defaultSelectedDataViewId: tempInferrer.getSelectedDataViewId(),
              createPipelineFlyoutOpen: true,
            });
          }
        });
      } else {
        tempInferrer?.getPipeline$().subscribe((testPipeline) => {
          if (handlePipelineConfigUpdate && testPipeline && externalPipelineConfig) {
            const {
              fieldMap: testFieldMap,
              inferenceConfig: testInferenceConfig,
              labels,
              multi_label: multiLabel,
              question,
            } = getInferencePropertiesFromPipelineConfig(taskType, testPipeline);

            const updatedPipeline = cloneDeep(externalPipelineConfig);
            const { inferenceObj: externalInference, inferenceConfig: externalInferenceConfig } =
              getInferencePropertiesFromPipelineConfig(taskType, updatedPipeline);

            if (externalInference) {
              // Always update target field change
              externalInference.field_map = testFieldMap;

              if (externalInferenceConfig === undefined) {
                externalInference.inference_config = testInferenceConfig;
              } else if (
                isMlIngestInferenceProcessor(externalInference) &&
                isMlInferencePipelineInferenceConfig(externalInference.inference_config)
              ) {
                // Only update the properties that change in the test step to avoid overwriting user edits
                if (
                  taskType === SUPPORTED_PYTORCH_TASKS.ZERO_SHOT_CLASSIFICATION &&
                  labels &&
                  multiLabel !== undefined
                ) {
                  const external =
                    externalInference.inference_config[
                      SUPPORTED_PYTORCH_TASKS.ZERO_SHOT_CLASSIFICATION
                    ];

                  if (external) {
                    external.multi_label = multiLabel;
                    external.labels = labels;
                  }
                } else if (
                  taskType === SUPPORTED_PYTORCH_TASKS.QUESTION_ANSWERING &&
                  question !== undefined
                ) {
                  const external =
                    externalInference.inference_config[SUPPORTED_PYTORCH_TASKS.QUESTION_ANSWERING];

                  if (external) {
                    external.question = question;
                  }
                }
              }
            }

            handlePipelineConfigUpdate({
              initialPipelineConfig: updatedPipeline,
            });
          }
        });
      }
    }
    return tempInferrer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputType, model, trainedModels, deploymentId, setCurrentContext]);

  useEffect(() => {
    return () => {
      inferrer?.destroy();
    };
  }, [inferrer, model.model_id]);

  if (inferrer !== undefined) {
    return <InferenceInputForm inferrer={inferrer} inputType={inputType} />;
  }

  return null;
};
