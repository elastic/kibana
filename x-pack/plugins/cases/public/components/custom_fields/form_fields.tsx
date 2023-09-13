/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';

import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { CustomFieldBuildType, CustomFieldTypesUI } from './types';
import { FieldTypeSelector } from './field_type/field_type_selector';
import { customFieldTypes } from './schema';
import { builderMap } from './builder';

interface FormFieldsProps {
  isSubmitting?: boolean;
}

const FormFieldsComponent: React.FC<FormFieldsProps> = ({ isSubmitting }) => {
  const [selectedType, setSelectedType] = useState<CustomFieldTypesUI>(customFieldTypes[0]);
  const handleTypeChange = useCallback(
    (val: CustomFieldTypesUI) => {
      setSelectedType(val);
    },
    [setSelectedType]
  );

  const builtCustomFields: CustomFieldBuildType[] = useMemo(() => {
    if (!customFieldTypes) {
      return [];
    }

    let customFieldBuilder: { build: () => CustomFieldBuildType[] } | null = null;

    return customFieldTypes.reduce<CustomFieldBuildType[]>((temp, customFieldType) => {
      const builder = builderMap[customFieldType];

      if (builder == null) {
        return [];
      }

      if (customFieldType === selectedType) {
        customFieldBuilder = builder({
          customFieldType,
          componentProps: {
            isLoading: isSubmitting,
          },
        });
      }

      return customFieldBuilder ? [...customFieldBuilder.build()] : [];
    }, []);
  }, [selectedType, isSubmitting]);

  const renderCustomField = (customField: CustomFieldBuildType, index: number) => {
    if (!customField) {
      return null;
    }

    const { customFieldType, fieldOptions } = customField;

    return (
      <React.Fragment key={index}>
        {customFieldType}
        {fieldOptions}
      </React.Fragment>
    );
  };

  return (
    <>
      <UseField
        path="fieldLabel"
        component={Field}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'custom-field-label-input',
            fullWidth: true,
            autoFocus: true,
            isLoading: isSubmitting,
          },
        }}
      />
      <UseField
        path="fieldType"
        component={FieldTypeSelector}
        componentProps={{
          customFieldTypes,
          dataTestSubj: 'custom-field-type-selector',
          selectedType,
          isLoading: isSubmitting,
          handleChange: handleTypeChange,
        }}
      />
      {builtCustomFields.map((customField, index) => renderCustomField(customField, index))}
    </>
  );
};

FormFieldsComponent.displayName = 'FormFields';

export const FormFields = memo(FormFieldsComponent);
