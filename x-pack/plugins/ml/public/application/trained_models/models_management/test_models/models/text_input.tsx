/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTextArea } from '@elastic/eui';

export const TextInput: FC<{
  disabled: boolean;
  inputText: string;
  setInputText(input: string): void;
  placeholder?: string;
}> = ({ disabled, inputText, setInputText, placeholder }) => {
  return (
    <EuiTextArea
      placeholder={
        placeholder ??
        i18n.translate('xpack.ml.trainedModels.testModelsFlyout.langIdent.inputText', {
          defaultMessage: 'Input text',
        })
      }
      value={inputText}
      disabled={disabled === true}
      fullWidth
      onChange={(e) => {
        setInputText(e.target.value);
      }}
    />
  );
};
