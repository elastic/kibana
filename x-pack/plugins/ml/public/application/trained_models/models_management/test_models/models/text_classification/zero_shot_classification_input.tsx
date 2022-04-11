/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiSpacer, EuiFieldText, EuiFormRow } from '@elastic/eui';

import { TextInput } from '../text_input';

const ClassNameInput: FC<{
  disabled: boolean;
  inputText: string;
  setInputText(input: string): void;
}> = ({ disabled, inputText, setInputText }) => {
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
        disabled={disabled === true}
        fullWidth
        onChange={(e) => {
          setInputText(e.target.value);
        }}
      />
    </EuiFormRow>
  );
};

export const ZeroShotClassificationInput: FC<{
  disabled: boolean;
  inputText: string;
  inputText2: string;
  setInputText(input: string): void;
  setInputText2(input: string): void;
}> = ({ disabled, inputText, setInputText, inputText2, setInputText2 }) => {
  return (
    <>
      <TextInput disabled={disabled} inputText={inputText} setInputText={setInputText} />
      <EuiSpacer />
      <ClassNameInput disabled={disabled} inputText={inputText2} setInputText={setInputText2} />
    </>
  );
};
