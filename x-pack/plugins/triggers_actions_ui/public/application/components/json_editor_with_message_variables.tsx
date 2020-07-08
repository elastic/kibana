/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { EuiCodeEditor, EuiFormRow } from '@elastic/eui';
import './add_message_variables.scss';
import { useXJsonMode } from '../../../../../../src/plugins/es_ui_shared/static/ace_x_json/hooks';

import { AddMessageVariables } from './add_message_variables';

interface Props {
  messageVariables: string[] | undefined;
  paramsProperty: string;
  inputTargetValue: string;
  label: string;
  errors?: string[];
  areaLabel?: string;
  onDocumentsChange: (data: string) => void;
}

export const JsonEditorWithMessageVariables: React.FunctionComponent<Props> = ({
  messageVariables,
  paramsProperty,
  inputTargetValue,
  label,
  errors,
  areaLabel,
  onDocumentsChange,
}) => {
  const [cursorPosition, setCursorPosition] = useState<any>(null);

  const { xJsonMode, convertToJson, setXJson, xJson } = useXJsonMode(inputTargetValue ?? null);

  const onSelectMessageVariable = (variable: string) => {
    const templatedVar = `{{${variable}}}`;
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
          onSelectEventHandler={(variable: string) => onSelectMessageVariable(variable)}
          paramsProperty={paramsProperty}
        />
      }
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
      />
    </EuiFormRow>
  );
};
