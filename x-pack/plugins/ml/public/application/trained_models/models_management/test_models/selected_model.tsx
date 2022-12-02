/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import React, { FC, useMemo, useEffect } from 'react';

import { NerInference } from './models/ner';
import { QuestionAnsweringInference } from './models/question_answering';

import {
  TextClassificationInference,
  FillMaskInference,
  ZeroShotClassificationInference,
  LangIdentInference,
} from './models/text_classification';

import { TextEmbeddingInference } from './models/text_embedding';

import {
  TRAINED_MODEL_TYPE,
  SUPPORTED_PYTORCH_TASKS,
} from '../../../../../common/constants/trained_models';
import { useMlApiContext } from '../../../contexts/kibana';
import { InferenceInputForm } from './models/inference_input_form';
import { InferrerType } from './models';
import { INPUT_TYPE } from './models/inference_base';

interface Props {
  model: estypes.MlTrainedModelConfig;
  inputType: INPUT_TYPE;
}

export const SelectedModel: FC<Props> = ({ model, inputType }) => {
  const { trainedModels } = useMlApiContext();

  const inferrer: InferrerType | undefined = useMemo(() => {
    if (model.model_type === TRAINED_MODEL_TYPE.PYTORCH) {
      const taskType = Object.keys(model.inference_config)[0];

      switch (taskType) {
        case SUPPORTED_PYTORCH_TASKS.NER:
          return new NerInference(trainedModels, model, inputType);
          break;
        case SUPPORTED_PYTORCH_TASKS.TEXT_CLASSIFICATION:
          return new TextClassificationInference(trainedModels, model, inputType);
          break;
        case SUPPORTED_PYTORCH_TASKS.ZERO_SHOT_CLASSIFICATION:
          return new ZeroShotClassificationInference(trainedModels, model, inputType);
          break;
        case SUPPORTED_PYTORCH_TASKS.TEXT_EMBEDDING:
          return new TextEmbeddingInference(trainedModels, model, inputType);
          break;
        case SUPPORTED_PYTORCH_TASKS.FILL_MASK:
          return new FillMaskInference(trainedModels, model, inputType);
          break;
        case SUPPORTED_PYTORCH_TASKS.QUESTION_ANSWERING:
          return new QuestionAnsweringInference(trainedModels, model, inputType);
          break;

        default:
          break;
      }
    } else if (model.model_type === TRAINED_MODEL_TYPE.LANG_IDENT) {
      return new LangIdentInference(trainedModels, model, inputType);
    }
  }, [inputType, model, trainedModels]);

  useEffect(() => {
    return () => {
      inferrer?.destroy();
    };
  }, [inferrer]);

  if (inferrer !== undefined) {
    return <InferenceInputForm inferrer={inferrer} inputType={inputType} />;
  }

  return null;
};
