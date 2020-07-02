/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { EuiTextArea, EuiFormRow } from '@elastic/eui';
import './add_message_variables.scss';
import { AddMessageVariables } from './add_message_variables';

interface Props {
  messageVariables: string[] | undefined;
  paramsProperty: string;
  index: number;
  inputTargetValue?: string;
  editAction: (property: string, value: any, index: number) => void;
  label: string;
  errors?: string[];
}

export const TextAreaWithMessageVariables: React.FunctionComponent<Props> = ({
  messageVariables,
  paramsProperty,
  index,
  inputTargetValue,
  editAction,
  label,
  errors,
}) => {
  const [cursorPositionStart, setCursorPositionStart] = useState<number>(0);
  const [cursorPositionEnd, setCursorPositionEnd] = useState<number>(0);

  const onSelectMessageVariable = (variable: string) => {
    let newValue = inputTargetValue || '';
    const templatedVar = `{{${variable}}}`;
    const startPosition = cursorPositionStart;
    const endPosition = cursorPositionEnd;
    newValue =
      (inputTargetValue || '').substring(0, startPosition) +
      templatedVar +
      (inputTargetValue || '').substring(endPosition, (inputTargetValue || '').length);
    setCursorPositionStart(startPosition + templatedVar.length);
    setCursorPositionEnd(endPosition + templatedVar.length);
    editAction(paramsProperty, newValue, index);
  };

  const onChangeWithMessageVariable = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    editAction(paramsProperty, e.target.value, index);
    setCursorPositionStart(e.target.selectionStart ?? 0);
    setCursorPositionEnd(e.target.selectionEnd ?? 0);
  };

  const onClickWithMessageVariable = (target: HTMLInputElement) => {
    setCursorPositionStart(target.selectionStart ?? 0);
    setCursorPositionEnd(target.selectionEnd ?? 0);
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
      <EuiTextArea
        fullWidth
        isInvalid={errors && errors.length > 0 && inputTargetValue !== undefined}
        name={paramsProperty}
        value={inputTargetValue}
        data-test-subj={`${paramsProperty}TextArea`}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChangeWithMessageVariable(e)}
        onClick={(e: React.MouseEvent<HTMLTextAreaElement, MouseEvent>) =>
          onClickWithMessageVariable(e.currentTarget)
        }
        onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) =>
          onClickWithMessageVariable(e.currentTarget)
        }
        onBlur={() => {
          if (!inputTargetValue) {
            editAction(paramsProperty, '', index);
          }
        }}
      />
    </EuiFormRow>
  );
};
