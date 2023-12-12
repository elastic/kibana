/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useEffect } from 'react';
import {
  getFieldValidityAndErrorMessage,
  UseField,
  useFormData,
  useFormContext,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { get } from 'lodash';
import { EuiComboBox, EuiSpacer, EuiFormRow } from '@elastic/eui';
import ECSSchema from './v.8.10.0_process.json';

interface FieldNameFieldProps {
  path: string;
  disabled: boolean;
  readDefaultValueOnForm: boolean;
  isRequired: boolean;
}

const ECSSchemaOptions = ECSSchema.map((ecs) => ({
  label: ecs.field,
  value: ecs,
}));

const SINGLE_SELECTION = { asPlainText: true };
const FIELD_LABEL = 'Custom field name';
const FieldNameFieldComponent = ({
  path,
  disabled,
  readDefaultValueOnForm,
  isRequired,
}: FieldNameFieldProps) => {
  const [data] = useFormData();
  const fieldValue = get(data, path);
  const context = useFormContext();

  const currentFieldNameField = context.getFields()[path];

  useEffect(() => {
    // hackish way to clear errors on this field - because we base this validation on the value of overwrite toggle
    if (currentFieldNameField && !isRequired) {
      currentFieldNameField?.clearErrors();
    }
  }, [currentFieldNameField, isRequired]);

  const renderEntityIdNote = useMemo(() => {
    const contains = fieldValue?.includes('entity_id');
    if (contains) {
      return (
        <FormattedMessage
          id="xpack.securitySolution.responseActions.endpoint.fieldDescription"
          defaultMessage="Entity_id is an endpoint specific field, if the alert does not come from endpoint we will not be able to send the action."
        />
      );
    }
    return null;
  }, [fieldValue]);

  const CONFIG = {
    label: i18n.translate('xpack.securitySolution.responseActions.endpoint.fieldLabel', {
      defaultMessage: FIELD_LABEL,
    }),
    helpText: renderEntityIdNote,
    validations: [
      {
        validator: ({ value }: { value: string }) => {
          if (isRequired && value === '') {
            return {
              code: 'ERR_FIELD_MISSING',
              path,
              message: i18n.translate(
                'xpack.securitySolution.responseActions.endpoint.validations.commandIsRequiredErrorMessage',
                {
                  defaultMessage:
                    '{field} is a required field when process.pid toggle is turned off',
                  values: { field: FIELD_LABEL },
                }
              ),
            };
          }
        },
      },
    ],
  };

  const optionsAsComboBoxOptions = ECSSchemaOptions.map(({ label }) => ({
    label,
    value: label,
  }));

  return (
    <>
      <UseField<string> path={path} readDefaultValueOnForm={readDefaultValueOnForm} config={CONFIG}>
        {(field) => {
          const { value, setValue } = field;
          const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

          const valueInList = !!optionsAsComboBoxOptions.find((option) => option.label === value);
          return (
            <EuiFormRow
              label={field.label}
              helpText={field.helpText}
              fullWidth
              error={errorMessage}
              isInvalid={isInvalid}
            >
              <EuiComboBox
                isInvalid={isInvalid}
                isDisabled={disabled || !isRequired}
                singleSelection={SINGLE_SELECTION}
                noSuggestions={false}
                options={optionsAsComboBoxOptions}
                fullWidth
                selectedOptions={value && valueInList ? [{ value, label: value }] : undefined}
                onChange={(newValue) => {
                  if (newValue.length === 0) {
                    // Don't allow clearing the type. One must always be selected
                    return;
                  }
                  setValue(newValue[0].label);
                }}
              />
            </EuiFormRow>
          );
        }}
      </UseField>
      <EuiSpacer size="s" />
    </>
  );
};
export const FieldNameField = React.memo(FieldNameFieldComponent);
