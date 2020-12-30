/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel } from '@elastic/eui';
import React, { FunctionComponent } from 'react';
import { EuiFormRow } from '@elastic/eui';
import {
  CodeEditor,
  FieldHook,
  getFieldValidityAndErrorMessage,
} from '../../../../../../shared_imports';

import './text_editor.scss';

interface Props {
  field: FieldHook<string>;
  editorProps: { [key: string]: any };
}

export const TextEditor: FunctionComponent<Props> = ({ field, editorProps }) => {
  const { value, helpText, setValue, label } = field;
  const { errorMessage } = getFieldValidityAndErrorMessage(field);

  return (
    <EuiFormRow
      label={label}
      helpText={helpText}
      isInvalid={typeof errorMessage === 'string'}
      error={errorMessage}
      fullWidth
    >
      <EuiPanel
        className="pipelineProcessorsEditor__form__textEditor__panel"
        paddingSize="s"
        hasShadow={false}
      >
        <CodeEditor value={value} onChange={setValue} {...(editorProps as any)} />
      </EuiPanel>
    </EuiFormRow>
  );
};
