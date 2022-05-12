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

const getFieldConfig = ({ label }: { label: string }) => ({
  label,
  validations: [
    {
      validator: emptyField(
        i18n.translate(
          'xpack.triggersActionsUI.sections.actionConnectorForm.error.requiredNameText',
          {
            defaultMessage: `${label} is required.`,
          }
        )
      ),
    },
  ],
});

interface PasswordFieldProps {
  path: string;
  label: string;
  helpText?: string | ReactNode;
  [key: string]: any;
}

const PasswordFieldComponent: React.FC<PasswordFieldProps> = ({
  path,
  label,
  helpText,
  ...rest
}) => {
  return (
    <UseField<string> path={path} config={getFieldConfig({ label })}>
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
              value={field.value as string}
              onChange={field.onChange}
              isLoading={field.isValidating}
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
