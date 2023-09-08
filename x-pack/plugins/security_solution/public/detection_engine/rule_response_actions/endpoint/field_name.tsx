/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { UseField, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { get } from 'lodash';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import ECSSchema from './v.8.10.0-pid.json';

interface FieldNameFieldProps {
  path: string;
  disabled: boolean;
  readDefaultValueOnForm: boolean;
}

const ECSSchemaOptions = ECSSchema.map((ecs) => ({
  label: ecs.field,
  value: ecs,
}));

const CONFIG = {
  label: i18n.translate('xpack.securitySolution.responseActions.endpoint.fieldLabel', {
    defaultMessage: 'Custom field name',
  }),
  helpText: (
    <FormattedMessage
      id="xpack.securitySolution.responseActions.endpoint.fieldDescription"
      defaultMessage="Specify field name that should be used instead of `process.pid`."
    />
  ),
};
const SINGLE_SELECTION = { asPlainText: true };

const FieldNameFieldComponent = ({
  path,
  disabled,
  readDefaultValueOnForm,
}: FieldNameFieldProps) => {
  const [data] = useFormData();
  const fieldValue = get(data, path);

  const renderEntityIdNote = useMemo(() => {
    const contains = fieldValue?.includes('entity_id');
    if (contains) {
      return (
        <span>
          Entity_id is an endpoint specific field, if the alert does not come from endpoint we will
          not be able to send the action.
        </span>
      );
    }
    return null;
  }, [fieldValue]);

  const optionsAsComboBoxOptions = ECSSchemaOptions.map(({ label }) => ({
    label,
    value: label,
  }));

  return (
    <>
      <UseField<string> path={path} readDefaultValueOnForm={readDefaultValueOnForm} config={CONFIG}>
        {(field) => {
          const { label, value, setValue } = field;
          const valueInList = !!optionsAsComboBoxOptions.find((option) => option.label === value);
          return (
            <EuiFormRow label={label} fullWidth>
              <EuiComboBox
                isDisabled={disabled}
                placeholder={i18n.translate(
                  'xpack.securitySolution.responseActions.endpoint.validations.customField',
                  {
                    defaultMessage: 'Select custom field',
                  }
                )}
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
      {/* TODO: Still waiting for mock ups regarding this*/}
      {renderEntityIdNote}
    </>
  );
};

export const FieldNameField = React.memo(FieldNameFieldComponent);
