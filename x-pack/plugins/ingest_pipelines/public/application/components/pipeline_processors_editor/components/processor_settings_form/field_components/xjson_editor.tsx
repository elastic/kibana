/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel } from '@elastic/eui';
import { XJsonLang } from '@kbn/monaco';
import React, { FunctionComponent, useCallback } from 'react';
import { EuiFormRow } from '@elastic/eui';
import {
  CodeEditor,
  FieldHook,
  getFieldValidityAndErrorMessage,
  Monaco,
} from '../../../../../../shared_imports';

export type OnXJsonEditorUpdateHandler<T = { [key: string]: any }> = (arg: {
  data: {
    raw: string;
    format(): T;
  };
  validate(): boolean;
  isValid: boolean | undefined;
}) => void;

interface Props {
  field: FieldHook<string>;
  editorProps: { [key: string]: any };
}

export const XJsonEditor: FunctionComponent<Props> = ({ field, editorProps }) => {
  const { value, helpText, setValue, label } = field;
  const { xJson, setXJson, convertToJson } = Monaco.useXJsonMode(value);
  const { errorMessage } = getFieldValidityAndErrorMessage(field);

  const onChange = useCallback(
    (s) => {
      setXJson(s);
      setValue(convertToJson(s));
    },
    [setValue, setXJson, convertToJson]
  );
  return (
    <EuiFormRow
      label={label}
      helpText={helpText}
      isInvalid={typeof errorMessage === 'string'}
      error={errorMessage}
      fullWidth
    >
      <EuiPanel paddingSize="s" hasShadow={false}>
        <CodeEditor
          value={xJson}
          languageId={XJsonLang.ID}
          editorDidMount={(m) => {
            XJsonLang.registerGrammarChecker(m);
          }}
          options={{ minimap: { enabled: false } }}
          onChange={onChange}
          {...(editorProps as any)}
        />
      </EuiPanel>
    </EuiFormRow>
  );
};
