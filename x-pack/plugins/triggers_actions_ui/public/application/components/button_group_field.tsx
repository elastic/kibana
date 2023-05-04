/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode } from 'react';
import { EuiButtonGroup, EuiFormRow } from '@elastic/eui';
import {
  getFieldValidityAndErrorMessage,
  UseField,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { i18n } from '@kbn/i18n';

const { emptyField } = fieldValidators;

const getFieldConfig = ({ label, defaultValue }: { label: string; defaultValue?: string }) => ({
  label,
  defaultValue,
  validations: [
    {
      validator: emptyField(
        i18n.translate('xpack.triggersActionsUI.components.buttonGroupField.error.requiredField', {
          values: { label },
          defaultMessage: '{label} is required.',
        })
      ),
    },
  ],
});

interface Props {
  path: string;
  label: string;
  defaultValue?: string;
  helpText?: string | ReactNode;
  [key: string]: any;
}

const ButtonGroupFieldComponent: React.FC<Props> = ({
  path,
  label,
  helpText,
  defaultValue,
  ...rest
}) => {
  return (
    <UseField<string> path={path} config={getFieldConfig({ label, defaultValue })}>
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
            <EuiButtonGroup
              isFullWidth
              buttonSize="m"
              legend="Select"
              color="primary"
              options={[]}
              idSelected={field.value}
              onChange={field.setValue}
              {...rest}
            />
          </EuiFormRow>
        );
      }}
    </UseField>
  );
};

export const ButtonGroupField = memo(ButtonGroupFieldComponent);
