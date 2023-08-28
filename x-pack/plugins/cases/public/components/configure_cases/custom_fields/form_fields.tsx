/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';

import { FieldConfig, FIELD_TYPES, UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import * as i18n from '../translations';
import { CustomFieldTypesUI } from './type';
import { FieldTypeSelector } from './field_type_selector';
import { FieldOptionsSelector } from './field_options/field_options_selector';

interface CustomFieldFormProps {
}

const { emptyField } = fieldValidators;

const fieldLabelConfig: FieldConfig = {
  label: i18n.FIELD_LABEL,
  type: FIELD_TYPES.TEXT,
  validations: [
    {
      validator: emptyField(i18n.REQUIRED_FIELD(i18n.FIELD_LABEL)),
    },
  ],
};

const fieldTypeConfig: FieldConfig = {
  label: i18n.FIELD_TYPE,
  validations: [
    {
      validator: emptyField(i18n.REQUIRED_FIELD(i18n.FIELD_LABEL)),
    },
  ],
};

const fieldOptionsConfig: FieldConfig = {
  label: i18n.FIELD_OPTIONS,
  type: FIELD_TYPES.CHECKBOX,
};

const customFieldTypes: CustomFieldTypesUI[] = [
  'Text', 'Textarea', 'List', 'Url', 'Boolean'
]


const FormFieldsComponent: React.FC<CustomFieldFormProps> = ({
}) => {
  const [selectedType, setSelectedType] = useState<string>(customFieldTypes[0]);
  const handleTypeChange = useCallback(
    (val: CustomFieldTypesUI) => {
      console.log('form field type change', val);
      setSelectedType(val);
    },
    [setSelectedType],
  );

  return (
    <>
      <UseField
        path="fieldLabel"
        config={fieldLabelConfig}
        component={Field}
        componentProps={{
          euiFieldProps: { 'data-test-subj': 'fieldLabelInput', fullWidth: true },
        }}
      />
      <UseField
        path="fieldType"
        config={fieldTypeConfig}
        component={FieldTypeSelector}
        componentProps={{
          customFieldTypes,
          dataTestSubj: 'fieldTypeDropdown',
          selectedType,
          handleChange: handleTypeChange,
        }}
      />
      {selectedType && (
        <UseField
          path="fieldOptions"
          config={fieldOptionsConfig}
          component={FieldOptionsSelector}
          componentProps={{
            dataTestSubj: 'fieldOptions',
            selectedType,
          }}
        />
      )}
    </>
  );
};

export const FormFields = memo(FormFieldsComponent);
