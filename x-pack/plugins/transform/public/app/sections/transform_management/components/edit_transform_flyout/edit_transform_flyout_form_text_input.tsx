/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { EuiFieldText, EuiFormRow } from '@elastic/eui';

interface EditTransformFlyoutFormTextInputProps {
  dataTestSubj: string;
  errorMessages: string[];
  helpText?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}

export const EditTransformFlyoutFormTextInput: FC<EditTransformFlyoutFormTextInputProps> = ({
  dataTestSubj,
  errorMessages,
  helpText,
  label,
  onChange,
  placeholder,
  value,
}) => {
  return (
    <EuiFormRow
      label={label}
      helpText={helpText}
      isInvalid={errorMessages.length > 0}
      error={errorMessages}
    >
      <EuiFieldText
        data-test-subj={dataTestSubj}
        placeholder={placeholder}
        isInvalid={errorMessages.length > 0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      />
    </EuiFormRow>
  );
};
