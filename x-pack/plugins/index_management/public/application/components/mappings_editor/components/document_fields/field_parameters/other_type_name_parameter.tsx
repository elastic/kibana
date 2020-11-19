/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';

import { i18n } from '@kbn/i18n';
import { UseField, TextField, FieldConfig, FieldHook } from '../../../shared_imports';
import { getFieldConfig } from '../../../lib';

/**
 * This is a special component that does not have an explicit entry in {@link PARAMETERS_DEFINITION}.
 *
 * We use it to store the name of types unknown to the mappings editor in the "subType" path.
 */

type FieldType = [{ value: string }];

const typeParameterConfig = getFieldConfig('type');

const fieldConfig: FieldConfig = {
  label: i18n.translate('xpack.idxMgmt.mappingsEditor.otherTypeNameFieldLabel', {
    defaultMessage: 'Type Name',
  }),
  defaultValue: '',
  deserializer: typeParameterConfig.deserializer,
  serializer: typeParameterConfig.serializer,
  validations: [
    {
      validator: ({ value: fieldValue }) => {
        if ((fieldValue as FieldType)[0].value.trim() === '') {
          return {
            message: i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.validations.otherTypeNameIsRequiredErrorMessage',
              {
                defaultMessage: 'The type name is required.',
              }
            ),
          };
        }
      },
    },
  ],
};

interface Props {
  field: FieldHook<FieldType>;
}

/**
 * The "subType" parameter can be configured either with a ComboBox (when the type is known)
 * or with a TextField (when the type is unknown). This causes its value to have different type
 * (either an array of object either a string). In order to align both value and let the consumer of
 * the value worry about a single type, we will create a custom TextField component that works with the
 * array of object that the ComboBox works with.
 */
const CustomTextField = ({ field }: Props) => {
  const { setValue } = field;

  const transformedField: FieldHook<any> = {
    ...field,
    value: field.value[0]?.value ?? '',
  };

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue([{ value: e.target.value }]);
    },
    [setValue]
  );

  return (
    <TextField
      field={transformedField}
      euiFieldProps={{ onChange, 'data-test-subj': 'fieldSubType' }}
    />
  );
};

export const OtherTypeNameParameter = () => (
  <UseField path="subType" config={fieldConfig} component={CustomTextField} />
);
