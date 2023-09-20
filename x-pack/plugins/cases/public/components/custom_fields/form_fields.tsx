/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';

import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { TextField, SelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { EuiSelectOption } from '@elastic/eui';
import type { CustomFieldBuildType } from './types';
import { CustomFieldTypes } from '../../../common/types/domain';
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
  const [selectedType, setSelectedType] = useState<CustomFieldTypes>(CustomFieldTypes.TEXT);

  const handleTypeChange = useCallback(
    (e) => {
      setSelectedType(e.target.value);
    },
    [setSelectedType]
  );

  const builtCustomField: CustomFieldBuildType | null = useMemo(() => {
    const builder = builderMap[selectedType];

    if (builder == null) {
      return null;
    }

    const customFieldBuilder = builder();

    return customFieldBuilder.build();
  }, [selectedType]);

  const ConfigurePage = builtCustomField?.ConfigurePage;
  const options = fieldTypeSelectOptions();

  return (
    <>
      <UseField
        path="label"
        component={TextField}
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
        component={SelectField}
        path="type"
        componentProps={{
          euiFieldProps: {
            options,
            'data-test-subj': 'custom-field-type-selector',
          },
          selectedType,
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
