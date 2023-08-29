/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';

import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { CustomFieldTypesUI } from './type';
import { FieldTypeSelector } from './field_type/field_type_selector';
import { FieldOptionsSelector } from './field_options/field_options_selector';
import { TextAreaHeightSelector } from './text_area_height/text_area_height_selector';
import { customFieldTypes } from './schema';

const FormFieldsComponent: React.FC = () => {
  const [selectedType, setSelectedType] = useState<string>(customFieldTypes[0]);
  const handleTypeChange = useCallback(
    (val: CustomFieldTypesUI) => {
      setSelectedType(val);
    },
    [setSelectedType]
  );

  return (
    <>
      <UseField
        path="fieldLabel"
        component={Field}
        componentProps={{
          euiFieldProps: { 'data-test-subj': 'fieldLabelInput', fullWidth: true },
        }}
      />
      <UseField
        path="fieldType"
        component={FieldTypeSelector}
        componentProps={{
          customFieldTypes,
          dataTestSubj: 'fieldTypeDropdown',
          selectedType,
          handleChange: handleTypeChange,
        }}
      />
      {selectedType && selectedType === 'Textarea' ? (
        <UseField
          path="textAreaHeight"
          component={TextAreaHeightSelector}
          componentProps={{
            dataTestSubj: 'textAreaHeight',
            idAria: 'textAreaHeight',
            euiFieldProps: { defaultValue: '2' },
          }}
        />
      ) : null}
      {selectedType && (
        <UseField
          path="fieldOptions"
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

FormFieldsComponent.displayName = 'FormFields';

export const FormFields = memo(FormFieldsComponent);
