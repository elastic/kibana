/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import React, { FC, useState } from 'react';
import { i18n } from '@kbn/i18n';

import { getNerOutputComponent, NerInference } from './models/ner';

import { getLangIdentOutputComponent, LangIdentInference } from './models/lang_ident';

import {
  getTextClassificationOutputComponent,
  TextClassificationInference,
  ZeroShotClassificationInference,
  ZeroShotClassificationInput,
  FillMaskInference,
  getFillMaskOutputComponent,
} from './models/text_classification';

import { getTextEmbeddingOutputComponent, TextEmbeddingInference } from './models/text_embedding';

import { TextInput } from './models/text_input';

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
  const [inputText, setInputText] = useState('');
  const [inputText2, setInputText2] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  if (model === null) {
    return null;
  }

  const getComp = (infer: any, getOutputComponent: any, getInputComponent: any) => {
    return (
      <InferenceInputForm
        getOutputComponent={getOutputComponent}
        getInputComponent={getInputComponent}
        inputText={inputText}
        infer={infer}
        isRunning={isRunning}
        setIsRunning={setIsRunning}
      />
    );
  };

  const getGeneralInputComponent = (placeholder?: string) => (
    <TextInput
      disabled={isRunning}
      inputText={inputText}
      setInputText={setInputText}
      placeholder={placeholder}
    />
  );

  if (model.model_type === TRAINED_MODEL_TYPE.PYTORCH) {
    if (Object.keys(model.inference_config)[0] === SUPPORTED_PYTORCH_TASKS.NER) {
      const inferrer = new NerInference(trainedModels, model);

      return (
        <>
          {getComp(
            () => inferrer.infer(inputText),
            getNerOutputComponent,
            getGeneralInputComponent
          )}
        </>
      );
    }

    if (Object.keys(model.inference_config)[0] === SUPPORTED_PYTORCH_TASKS.TEXT_CLASSIFICATION) {
      const inferrer = new TextClassificationInference(trainedModels, model);

      return (
        <>
          {getComp(
            () => inferrer.infer(inputText),
            getTextClassificationOutputComponent,
            getGeneralInputComponent
          )}
        </>
      );
    }

    if (
      Object.keys(model.inference_config)[0] === SUPPORTED_PYTORCH_TASKS.ZERO_SHOT_CLASSIFICATION
    ) {
      const inferrer = new ZeroShotClassificationInference(trainedModels, model);

      const getZeroShotInputComponent = () => (
        <ZeroShotClassificationInput
          disabled={isRunning}
          inputText={inputText}
          inputText2={inputText2}
          setInputText={setInputText}
          setInputText2={setInputText2}
        />
      );

      return (
        <>
          {getComp(
            () => inferrer.infer(inputText, inputText2),
            getTextClassificationOutputComponent,
            getZeroShotInputComponent
          )}
        </>
      );
    }

    if (Object.keys(model.inference_config)[0] === SUPPORTED_PYTORCH_TASKS.TEXT_EMBEDDING) {
      const inferrer = new TextEmbeddingInference(trainedModels, model);

      return (
        <>
          {getComp(
            () => inferrer.infer(inputText),
            getTextEmbeddingOutputComponent,
            getGeneralInputComponent
          )}
        </>
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
        <>
          {getComp(
            () => inferrer.infer(inputText),
            getFillMaskOutputComponent(inputText),
            () => getGeneralInputComponent(placeholder)
          )}
        </>
      );
    }
  }
  if (model.model_type === TRAINED_MODEL_TYPE.LANG_IDENT) {
    const inferrer = new LangIdentInference(trainedModels, model);

    return (
      <>
        {getComp(
          () => inferrer.infer(inputText),
          getLangIdentOutputComponent,
          getGeneralInputComponent
        )}
      </>
    );
  }

  return null;
};
