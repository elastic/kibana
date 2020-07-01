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
}

export const TextAreaWithMessageVariables: React.FunctionComponent<Props> = ({
  messageVariables,
  paramsProperty,
  index,
  inputTargetValue,
  editAction,
  label,
}) => {
  const [cursorPositionStart, setCursorPositionStart] = useState<number>(0);
  const [cursorPositionEnd, setCursorPositionEnd] = useState<number>(0);

  const onSelectMessageVariable = (variable: string) => {
    let newValue = inputTargetValue ?? '';
    const templatedVar = `{{${variable}}}`;
    const startPosition = cursorPositionStart;
    const endPosition = cursorPositionEnd;
    newValue =
      newValue.substring(0, startPosition) +
      templatedVar +
      newValue.substring(endPosition, newValue.length);
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
    <EuiFormRow
      fullWidth
      // error={errors.message}
      // isInvalid={errors.message.length > 0 && message !== undefined}
      label={label}
      labelAppend={
        <AddMessageVariables
          messageVariables={messageVariables}
          onSelectEventHandler={(variable: string) =>
            onSelectMessageVariable(paramsProperty, variable, index)
          }
          paramsProperty={paramsProperty}
        />
      }
    >
      <EuiTextArea
        fullWidth
        // isInvalid={errors.message.length > 0 && inputTargetValue !== undefined}
        name={paramsProperty}
        value={inputTargetValue}
        data-test-subj={`{${paramsProperty}TextArea`}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onChangeWithMessageVariable(e, paramsProperty, index)
        }
        onClick={(e: React.MouseEvent<HTMLInputElement, MouseEvent>) =>
          onClickWithMessageVariable(e)
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
