/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';

import { getNerOutputComponent, NerInference } from './models/ner';

import { getLangIdentOutputComponent, LangIdentInference } from './models/lang_ident';

import {
  getTextClassificationOutputComponent,
  TextClassificationInference,
  ZeroShotClassificationInference,
  FillMaskInference,
  getFillMaskOutputComponent,
  getZeroShotClassificationInput,
} from './models/text_classification';

import { getTextEmbeddingOutputComponent, TextEmbeddingInference } from './models/text_embedding';

import { getGeneralInputComponent } from './models/text_input';

import {
  TRAINED_MODEL_TYPE,
  SUPPORTED_PYTORCH_TASKS,
} from '../../../../../common/constants/trained_models';
import { useMlApiContext } from '../../../contexts/kibana';
import { InferenceInputForm } from './models/inference_input_form';

interface Props {
  model: estypes.MlTrainedModelConfig | null;
}

export const SelectedModel: FC<Props> = ({ model }) => {
  const { trainedModels } = useMlApiContext();

  if (model === null) {
    return null;
  }

  if (model.model_type === TRAINED_MODEL_TYPE.PYTORCH) {
    if (Object.keys(model.inference_config)[0] === SUPPORTED_PYTORCH_TASKS.NER) {
      const inferrer = new NerInference(trainedModels, model);
      return (
        <InferenceInputForm
          inferrer={inferrer}
          getOutputComponent={getNerOutputComponent(inferrer)}
          getInputComponent={getGeneralInputComponent(inferrer)}
        />
      );
    }

    if (Object.keys(model.inference_config)[0] === SUPPORTED_PYTORCH_TASKS.TEXT_CLASSIFICATION) {
      const inferrer = new TextClassificationInference(trainedModels, model);

      return (
        <InferenceInputForm
          inferrer={inferrer}
          getOutputComponent={getTextClassificationOutputComponent(inferrer)}
          getInputComponent={getGeneralInputComponent(inferrer)}
        />
      );
    }

    if (
      Object.keys(model.inference_config)[0] === SUPPORTED_PYTORCH_TASKS.ZERO_SHOT_CLASSIFICATION
    ) {
      const inferrer = new ZeroShotClassificationInference(trainedModels, model);

      return (
        <InferenceInputForm
          inferrer={inferrer}
          getOutputComponent={getTextClassificationOutputComponent(inferrer)}
          getInputComponent={getZeroShotClassificationInput(inferrer)}
        />
      );
    }

    if (Object.keys(model.inference_config)[0] === SUPPORTED_PYTORCH_TASKS.TEXT_EMBEDDING) {
      const inferrer = new TextEmbeddingInference(trainedModels, model);

      return (
        <InferenceInputForm
          inferrer={inferrer}
          getOutputComponent={getTextEmbeddingOutputComponent(inferrer)}
          getInputComponent={getGeneralInputComponent(inferrer)}
        />
      );
    }

    if (Object.keys(model.inference_config)[0] === SUPPORTED_PYTORCH_TASKS.FILL_MASK) {
      const inferrer = new FillMaskInference(trainedModels, model);

      const placeholder = i18n.translate(
        'xpack.ml.trainedModels.testModelsFlyout.langIdent.inputText',
        {
          defaultMessage: 'Mask token: [MASK]. e.g. Paris is the [MASK] of France.',
        }
      );

      return (
        <InferenceInputForm
          inferrer={inferrer}
          getOutputComponent={getFillMaskOutputComponent(inferrer)}
          getInputComponent={getGeneralInputComponent(inferrer, placeholder)}
        />
      );
    }
  }
  if (model.model_type === TRAINED_MODEL_TYPE.LANG_IDENT) {
    const inferrer = new LangIdentInference(trainedModels, model);

    return (
      <InferenceInputForm
        inferrer={inferrer}
        getOutputComponent={getLangIdentOutputComponent(inferrer)}
        getInputComponent={getGeneralInputComponent(inferrer)}
      />
    );
  }

  return null;
};
