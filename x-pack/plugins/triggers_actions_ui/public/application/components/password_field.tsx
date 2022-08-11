/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode } from 'react';
import { EuiFieldPassword, EuiFormRow } from '@elastic/eui';
import {
  getFieldValidityAndErrorMessage,
  UseField,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { i18n } from '@kbn/i18n';

const { emptyField } = fieldValidators;

const getFieldConfig = ({ label, validate }: { label: string; validate: boolean }) => ({
  label,
  validations: [
    ...(validate
      ? [
          {
            validator: emptyField(
              i18n.translate(
                'xpack.triggersActionsUI.components.passwordField.error.requiredNameText',
                {
                  values: { label },
                  defaultMessage: '{label} is required.',
                }
              )
            ),
          },
        ]
      : []),
  ],
});

interface PasswordFieldProps {
  path: string;
  label: string;
  helpText?: string | ReactNode;
  validate?: boolean;
  isLoading?: boolean;
  [key: string]: any;
}

const PasswordFieldComponent: React.FC<PasswordFieldProps> = ({
  path,
  label,
  helpText,
  validate = true,
  isLoading,
  ...rest
}) => {
  return (
    <UseField<string> path={path} config={getFieldConfig({ label, validate })}>
      {(field) => {
        const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

        return (
          <EuiFormRow
            label={field.label}
            labelAppend={field.labelAppend}
            helpText={helpText}
            error={errorMessage}
            isInvalid={isInvalid}
            fullWidth
          >
            <EuiFieldPassword
              isInvalid={isInvalid}
              value={field.value}
              onChange={field.onChange}
              isLoading={field.isValidating || isLoading === true}
              fullWidth
              {...rest}
            />
          </EuiFormRow>
        );
      }}
    </UseField>
  );
};

export const PasswordField = memo(PasswordFieldComponent);
