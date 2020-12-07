/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { EuiCodeEditor, EuiFormRow } from '@elastic/eui';
import { XJsonMode } from '@kbn/ace';

import './add_message_variables.scss';
import { XJson } from '../../../../../../src/plugins/es_ui_shared/public';

import { AddMessageVariables } from './add_message_variables';
import { ActionVariable } from '../../types';
import { templateActionVariable } from '../lib';

interface Props {
  messageVariables?: ActionVariable[];
  paramsProperty: string;
  inputTargetValue?: string;
  label: string;
  errors?: string[];
  areaLabel?: string;
  onDocumentsChange: (data: string) => void;
  helpText?: JSX.Element;
  onBlur?: () => void;
}

const { useXJsonMode } = XJson;
const xJsonMode = new XJsonMode();

export const JsonEditorWithMessageVariables: React.FunctionComponent<Props> = ({
  messageVariables,
  paramsProperty,
  inputTargetValue,
  label,
  errors,
  areaLabel,
  onDocumentsChange,
  helpText,
  onBlur,
}) => {
  const [cursorPosition, setCursorPosition] = useState<any>(null);

  const { convertToJson, setXJson, xJson } = useXJsonMode(inputTargetValue ?? null);

  const onSelectMessageVariable = (variable: ActionVariable) => {
    const templatedVar = templateActionVariable(variable);
    let newValue = '';
    if (cursorPosition) {
      const cursor = cursorPosition.getCursor();
      cursorPosition.session.insert(cursor, templatedVar);
      newValue = cursorPosition.session.getValue();
    } else {
      newValue = templatedVar;
    }
    setXJson(newValue);
    // Keep the documents in sync with the editor content
    onDocumentsChange(convertToJson(newValue));
  };

  const onClickWithMessageVariable = (_value: any) => {
    setCursorPosition(_value);
  };

  return (
    <EuiFormRow
      fullWidth
      error={errors}
      isInvalid={errors && errors.length > 0 && inputTargetValue !== undefined}
      label={label}
      labelAppend={
        <AddMessageVariables
          messageVariables={messageVariables}
          onSelectEventHandler={onSelectMessageVariable}
          paramsProperty={paramsProperty}
        />
      }
      helpText={helpText}
    >
      <EuiCodeEditor
        mode={xJsonMode}
        width="100%"
        height="200px"
        theme="github"
        data-test-subj={`${paramsProperty}JsonEditor`}
        aria-label={areaLabel}
        value={xJson}
        onChange={(xjson: string, e: any) => {
          setXJson(xjson);
          // Keep the documents in sync with the editor content
          onDocumentsChange(convertToJson(xjson));
        }}
        onCursorChange={(_value: any) => onClickWithMessageVariable(_value)}
        onBlur={onBlur}
      />
    </EuiFormRow>
  );
};
