/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';

import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field, SelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { EuiSelectOption } from '@elastic/eui';
import type { CustomFieldTypes, CustomFieldBuildType } from './types';
import { customFieldTypesValues } from './schema';
import { builderMap } from './builder';

interface FormFieldsProps {
  isSubmitting?: boolean;
}

const fieldTypeSelectOptions = (): EuiSelectOption[] => {
  const options = [];

  for (const [id, builder] of Object.entries(builderMap)) {
    const createdBuilder = builder();
    options.push({ value: id, text: createdBuilder.label });
  }

  return options;
};

const FormFieldsComponent: React.FC<FormFieldsProps> = ({ isSubmitting }) => {
  const [selectedType, setSelectedType] = useState<CustomFieldTypes>(customFieldTypesValues[0]);

  const handleTypeChange = useCallback(
    (e: CustomFieldTypes) => {
      setSelectedType(e.target.value);
    },
    [setSelectedType]
  );

  const builtCustomField: CustomFieldBuildType[] | null = useMemo(() => {
    if (!customFieldTypesValues) {
      return null;
    }

    const builder = builderMap[selectedType];

    if (builder == null) {
      return null;
    }

    const customFieldBuilder = builder();

    return customFieldBuilder.build();
  }, [selectedType]);

  const ConfigurePage = builtCustomField?.length && builtCustomField[0]?.ConfigurePage;
  const options = fieldTypeSelectOptions();

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
        component={SelectField}
        componentProps={{
          euiFieldProps: {
            options,
          },
          dataTestSubj: 'custom-field-type-selector',
          isLoading: isSubmitting,
          onChange: handleTypeChange,
        }}
      />
      {ConfigurePage ? <ConfigurePage /> : null}
    </>
  );
};

FormFieldsComponent.displayName = 'FormFields';

export const FormFields = memo(FormFieldsComponent);
