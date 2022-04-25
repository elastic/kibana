/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';
import { EuiTextArea } from '@elastic/eui';
import { NerInference } from './ner';
import {
  TextClassificationInference,
  ZeroShotClassificationInference,
  FillMaskInference,
} from './text_classification';
import { TextEmbeddingInference } from './text_embedding';
import { LangIdentInference } from './lang_ident';

export const TextInput: FC<{
  placeholder?: string;
  setExternalInputText: (inputText: string) => void;
  inferrer:
    | NerInference
    | TextClassificationInference
    | TextEmbeddingInference
    | ZeroShotClassificationInference
    | FillMaskInference
    | LangIdentInference;
}> = ({ placeholder, setExternalInputText, inferrer }) => {
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    setExternalInputText(inputText);
  }, [inputText]);

  const isRunning = useObservable(inferrer.isRunning$);

  return (
    <EuiTextArea
      placeholder={
        placeholder ??
        i18n.translate('xpack.ml.trainedModels.testModelsFlyout.generalTextInput.inputText', {
          defaultMessage: 'Input text',
        })
      }
      value={inputText}
      disabled={isRunning}
      fullWidth
      onChange={(e) => {
        setInputText(e.target.value);
      }}
    />
  );
};

export const getGeneralInputComponent =
  (
    inferrer:
      | NerInference
      | TextClassificationInference
      | TextEmbeddingInference
      | ZeroShotClassificationInference
      | FillMaskInference
      | LangIdentInference,
    placeholder?: string
  ) =>
  () => {
    let inputText = '';

    return {
      inputComponent: (
        <TextInput
          placeholder={placeholder}
          setExternalInputText={(txt: string) => (inputText = txt)}
          inferrer={inferrer}
        />
      ),
      infer: () => inferrer.infer(inputText),
    };
  };
