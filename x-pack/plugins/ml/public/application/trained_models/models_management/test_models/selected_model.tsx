/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
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
      const intro = i18n.translate('xpack.ml.trainedModels.testModelsFlyout.ner.intro', {
        defaultMessage: 'Try out named entity recognition with {modelId}',
        values: {
          modelId: model.model_id,
        },
      });
      return <InferenceInputForm inferrer={inferrer} intro={intro} />;
    }

    if (Object.keys(model.inference_config)[0] === SUPPORTED_PYTORCH_TASKS.TEXT_CLASSIFICATION) {
      const inferrer = new TextClassificationInference(trainedModels, model);
      const intro = i18n.translate(
        'xpack.ml.trainedModels.testModelsFlyout.textClassification.intro',
        {
          defaultMessage: 'Try out text classification with {modelId}',
          values: {
            modelId: model.model_id,
          },
        }
      );
      return <InferenceInputForm inferrer={inferrer} intro={intro} />;
    }

    if (
      Object.keys(model.inference_config)[0] === SUPPORTED_PYTORCH_TASKS.ZERO_SHOT_CLASSIFICATION
    ) {
      const inferrer = new ZeroShotClassificationInference(trainedModels, model);
      const intro = i18n.translate(
        'xpack.ml.trainedModels.testModelsFlyout.zeroShotClassification.intro',
        {
          defaultMessage: 'Try out zero shot classification with {modelId}',
          values: {
            modelId: model.model_id,
          },
        }
      );
      return <InferenceInputForm inferrer={inferrer} intro={intro} />;
    }

    if (Object.keys(model.inference_config)[0] === SUPPORTED_PYTORCH_TASKS.TEXT_EMBEDDING) {
      const inferrer = new TextEmbeddingInference(trainedModels, model);
      const intro = i18n.translate('xpack.ml.trainedModels.testModelsFlyout.textEmbedding.intro', {
        defaultMessage: 'Try out text embedding with {modelId}',
        values: {
          modelId: model.model_id,
        },
      });
      return <InferenceInputForm inferrer={inferrer} intro={intro} />;
    }

    if (Object.keys(model.inference_config)[0] === SUPPORTED_PYTORCH_TASKS.FILL_MASK) {
      const inferrer = new FillMaskInference(trainedModels, model);
      const intro = i18n.translate('xpack.ml.trainedModels.testModelsFlyout.fillMask.intro', {
        defaultMessage: 'Try out fill mask with {modelId}',
        values: {
          modelId: model.model_id,
        },
      });
      return <InferenceInputForm inferrer={inferrer} intro={intro} />;
    }

    if (Object.keys(model.inference_config)[0] === SUPPORTED_PYTORCH_TASKS.QUESTION_ANSWERING) {
      const inferrer = new QuestionAnsweringInference(trainedModels, model);
      const intro = i18n.translate(
        'xpack.ml.trainedModels.testModelsFlyout.questionAnswering.intro',
        {
          defaultMessage: 'Try out question answering with {modelId}',
          values: {
            modelId: model.model_id,
          },
        }
      );
      return <InferenceInputForm inferrer={inferrer} intro={intro} />;
    }
  }
  if (model.model_type === TRAINED_MODEL_TYPE.LANG_IDENT) {
    const inferrer = new LangIdentInference(trainedModels, model);
    const intro = i18n.translate('xpack.ml.trainedModels.testModelsFlyout.langIdent.intro', {
      defaultMessage: 'Try out language identification with {modelId}',
      values: {
        modelId: model.model_id,
      },
    });
    return <InferenceInputForm inferrer={inferrer} intro={intro} />;
  }

  return null;
};
