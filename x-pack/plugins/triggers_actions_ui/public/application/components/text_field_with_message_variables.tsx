/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { ActionVariable } from '@kbn/alerting-plugin/common';
import { AddMessageVariables } from '@kbn/alerts-ui-shared';
import { templateActionVariable } from '../lib';

interface Props {
  buttonTitle?: string;
  messageVariables?: ActionVariable[];
  paramsProperty: string;
  index: number;
  inputTargetValue?: string;
  editAction: (property: string, value: any, index: number) => void;
  errors?: string[];
  defaultValue?: string | number | string[];
  wrapField?: boolean;
  formRowProps?: {
    describedByIds?: string[];
    error: string | null;
    fullWidth: boolean;
    helpText: string;
    isInvalid: boolean;
    label?: string;
  };
  showButtonTitle?: boolean;
}

const Wrapper = ({
  children,
  wrapField,
  formRowProps,
  button,
}: {
  wrapField: boolean;
  children: React.ReactElement;
  button: React.ReactElement;
  formRowProps?: {
    describedByIds?: string[];
    error: string | null;
    fullWidth: boolean;
    helpText: string;
    isInvalid: boolean;
    label?: string;
  };
}) =>
  wrapField ? (
    <EuiFormRow {...formRowProps} labelAppend={button}>
      {children}
    </EuiFormRow>
  ) : (
    <>{children}</>
  );

export const TextFieldWithMessageVariables: React.FunctionComponent<Props> = ({
  buttonTitle,
  messageVariables,
  paramsProperty,
  index,
  inputTargetValue,
  editAction,
  errors,
  formRowProps,
  defaultValue,
  wrapField = false,
  showButtonTitle,
}) => {
  const [currentTextElement, setCurrentTextElement] = useState<HTMLInputElement | null>(null);

  const onSelectMessageVariable = useCallback(
    (variable: ActionVariable) => {
      const templatedVar = templateActionVariable(variable);
      const startPosition = currentTextElement?.selectionStart ?? 0;
      const endPosition = currentTextElement?.selectionEnd ?? 0;
      const newValue =
        (inputTargetValue ?? '').substring(0, startPosition) +
        templatedVar +
        (inputTargetValue ?? '').substring(endPosition, (inputTargetValue ?? '').length);
      editAction(paramsProperty, newValue, index);
    },
    [currentTextElement, editAction, index, inputTargetValue, paramsProperty]
  );

  const onChangeWithMessageVariable = (e: React.ChangeEvent<HTMLInputElement>) => {
    editAction(paramsProperty, e.target.value, index);
  };
  const VariableButton = useMemo(
    () => (
      <AddMessageVariables
        buttonTitle={buttonTitle}
        messageVariables={messageVariables}
        onSelectEventHandler={onSelectMessageVariable}
        paramsProperty={paramsProperty}
        showButtonTitle={showButtonTitle}
      />
    ),
    [buttonTitle, messageVariables, onSelectMessageVariable, paramsProperty, showButtonTitle]
  );

  return (
    <Wrapper wrapField={wrapField} formRowProps={formRowProps} button={VariableButton}>
      <EuiFieldText
        fullWidth
        name={paramsProperty}
        id={`${paramsProperty}Id`}
        isInvalid={errors && errors.length > 0 && inputTargetValue !== undefined}
        data-test-subj={`${paramsProperty}Input`}
        value={inputTargetValue || ''}
        defaultValue={defaultValue}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChangeWithMessageVariable(e)}
        onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
          setCurrentTextElement(e.target);
        }}
        onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
          if (!inputTargetValue) {
            editAction(paramsProperty, '', index);
          }
        }}
        append={wrapField ? undefined : VariableButton}
      />
    </Wrapper>
  );
};
