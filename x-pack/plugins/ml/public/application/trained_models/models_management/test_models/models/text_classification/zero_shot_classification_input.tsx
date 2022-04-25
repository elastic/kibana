/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';

import { EuiSpacer, EuiFieldText, EuiFormRow } from '@elastic/eui';

import { TextInput } from '../text_input';
import { ZeroShotClassificationInference } from './zero_shot_classification_inference';

const ClassNameInput: FC<{
  setExternalInputText: (inputText: string) => void;
  inferrer: ZeroShotClassificationInference;
}> = ({ setExternalInputText, inferrer }) => {
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    setExternalInputText(inputText);
  }, [inputText]);

  const isRunning = useObservable(inferrer.isRunning$);
  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.ml.trainedModels.testModelsFlyout.textClassification.classNamesInput',
        {
          defaultMessage: 'Possible class names (comma-separated)',
        }
      )}
    >
      <EuiFieldText
        value={inputText}
        disabled={isRunning === true}
        fullWidth
        onChange={(e) => {
          setInputText(e.target.value);
        }}
      />
    </EuiFormRow>
  );
};

export const getZeroShotClassificationInput =
  (inferrer: ZeroShotClassificationInference, placeholder?: string) => () => {
    let inputText = '';
    let inputText2 = '';

    return {
      inputComponent: (
        <>
          <TextInput
            placeholder={placeholder}
            setExternalInputText={(txt: string) => (inputText = txt)}
            inferrer={inferrer}
          />
          <EuiSpacer />
          <ClassNameInput
            setExternalInputText={(txt: string) => (inputText2 = txt)}
            inferrer={inferrer}
          />
        </>
      ),
      infer: () => inferrer.infer(inputText, inputText2),
    };
  };
