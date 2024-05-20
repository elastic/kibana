/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { EuiFieldText, EuiFormRow, EuiTextArea } from '@elastic/eui';

interface InputProps {
  label: ReactNode;
  placeholder?: string;
  dataTestSubj?: string;
  inputProps: {
    props: {
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
      value: string;
      isInvalid?: boolean;
      disabled?: boolean;
    };
    formRowProps: {
      error?: string[];
      isInvalid?: boolean;
    };
  };
}

export const TextInput: React.FunctionComponent<InputProps> = ({
  label,
  inputProps,
  placeholder,
  dataTestSubj,
}) => (
  <EuiFormRow fullWidth label={label} {...inputProps.formRowProps}>
    <EuiFieldText
      data-test-subj={dataTestSubj}
      fullWidth
      {...inputProps.props}
      placeholder={placeholder}
    />
  </EuiFormRow>
);

export const TextAreaInput: React.FunctionComponent<InputProps> = ({
  label,
  inputProps,
  placeholder,
  dataTestSubj,
}) => (
  <EuiFormRow fullWidth label={label} {...inputProps.formRowProps}>
    <EuiTextArea
      fullWidth
      rows={5}
      data-test-subj={dataTestSubj}
      {...inputProps.props}
      placeholder={placeholder}
    />
  </EuiFormRow>
);
