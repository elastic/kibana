/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import React, { FC, useState } from 'react';

import { NerOutput, NerInference } from './models/ner';
import type { FormattedNerResponse } from './models/ner';

import { LangIdentOutput, LangIdentInference } from './models/lang_ident';
import type { FormattedLangIdentResponse } from './models/lang_ident';

import {
  TextClassificationOutput,
  TextClassificationInference,
  ZeroShotClassificationInference,
  ZeroShotClassificationInput,
} from './models/text_classification';
import type { FormattedTextClassificationResponse } from './models/text_classification';

import { TextEmbeddingOutput, TextEmbeddingInference } from './models/text_embedding';
import type { FormattedTextEmbeddingResponse } from './models/text_embedding';

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

  const getInputComponent = () => (
    <TextInput disabled={isRunning} inputText={inputText} setInputText={setInputText} />
  );

  if (model.model_type === TRAINED_MODEL_TYPE.PYTORCH) {
    if (Object.keys(model.inference_config)[0] === SUPPORTED_PYTORCH_TASKS.NER) {
      const inferrer = new NerInference(trainedModels, model);
      const getOutputComponent = (output: FormattedNerResponse) => <NerOutput result={output} />;

      return <>{getComp(() => inferrer.infer(inputText), getOutputComponent, getInputComponent)}</>;
    }

    if (Object.keys(model.inference_config)[0] === SUPPORTED_PYTORCH_TASKS.TEXT_CLASSIFICATION) {
      const inferrer = new TextClassificationInference(trainedModels, model);
      const getOutputComponent = (output: FormattedTextClassificationResponse) => (
        <TextClassificationOutput result={output} />
      );

      return <>{getComp(() => inferrer.infer(inputText), getOutputComponent, getInputComponent)}</>;
    }

    if (
      Object.keys(model.inference_config)[0] === SUPPORTED_PYTORCH_TASKS.ZERO_SHOT_CLASSIFICATION
    ) {
      const inferrer = new ZeroShotClassificationInference(trainedModels, model);

      const getOutputComponent = (output: FormattedTextClassificationResponse) => (
        <TextClassificationOutput result={output} />
      );
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
            getOutputComponent,
            getZeroShotInputComponent
          )}
        </>
      );
    }

    if (Object.keys(model.inference_config)[0] === SUPPORTED_PYTORCH_TASKS.TEXT_EMBEDDING) {
      const inferrer = new TextEmbeddingInference(trainedModels, model);
      const getOutputComponent = (output: FormattedTextEmbeddingResponse) => (
        <TextEmbeddingOutput result={output} />
      );

      return <>{getComp(() => inferrer.infer(inputText), getOutputComponent, getInputComponent)}</>;
    }
  }
  if (model.model_type === TRAINED_MODEL_TYPE.LANG_IDENT) {
    const inferrer = new LangIdentInference(trainedModels, model);
    const getOutputComponent = (output: FormattedLangIdentResponse) => (
      <LangIdentOutput result={output} />
    );

    return <>{getComp(inferrer, getOutputComponent, getInputComponent)}</>;
  }

  return null;
};
