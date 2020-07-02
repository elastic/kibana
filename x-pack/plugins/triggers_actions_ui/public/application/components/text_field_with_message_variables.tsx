/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { EuiFieldText } from '@elastic/eui';
import './add_message_variables.scss';
import { AddMessageVariables } from './add_message_variables';

interface Props {
  messageVariables: string[] | undefined;
  paramsProperty: string;
  index: number;
  inputTargetValue?: string;
  editAction: (property: string, value: any, index: number) => void;
  errors?: string[];
}

export const TextFieldWithMessageVariables: React.FunctionComponent<Props> = ({
  messageVariables,
  paramsProperty,
  index,
  inputTargetValue,
  editAction,
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
    setCursorPositionEnd(startPosition + templatedVar.length);
    editAction(paramsProperty, newValue, index);
  };

  const onChangeWithMessageVariable = (e: React.ChangeEvent<HTMLInputElement>) => {
    editAction(paramsProperty, e.target.value, index);
    setCursorPositionStart(e.target.selectionStart ?? 0);
    setCursorPositionEnd(e.target.selectionEnd ?? 0);
  };

  const onClickWithMessageVariable = (e: React.MouseEvent<HTMLInputElement, MouseEvent>) => {
    setCursorPositionStart(e.currentTarget.selectionStart ?? 0);
    setCursorPositionEnd(e.currentTarget.selectionEnd ?? 0);
  };

  return (
    <EuiFieldText
      fullWidth
      name={paramsProperty}
      id={`${paramsProperty}Id`}
      isInvalid={errors && errors.length > 0 && inputTargetValue !== undefined}
      data-test-subj={`${paramsProperty}Input`}
      value={inputTargetValue}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChangeWithMessageVariable(e)}
      onClick={(e: React.MouseEvent<HTMLInputElement, MouseEvent>) => onClickWithMessageVariable(e)}
      onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
        if (!inputTargetValue) {
          editAction(paramsProperty, '', index);
        }
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLInputElement, MouseEvent>) => {
        if (e.currentTarget.id !== `${paramsProperty}Id`) {
          setCursorPositionStart((inputTargetValue || '').length);
          setCursorPositionEnd((inputTargetValue || '').length);
        }
      }}
      append={
        <AddMessageVariables
          messageVariables={messageVariables}
          onSelectEventHandler={(variable: string) => onSelectMessageVariable(variable)}
          paramsProperty={paramsProperty}
        />
      }
    />
  );
};
