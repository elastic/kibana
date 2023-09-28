/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  TextField,
  SelectField,
  HiddenField,
} from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { EuiSelectOption } from '@elastic/eui';
import { CustomFieldTypes } from '../../../common/types/domain';
import { builderMap } from './builder';

interface FormFieldsProps {
  isSubmitting?: boolean;
  isEditMode?: boolean;
}

const fieldTypeSelectOptions = (): EuiSelectOption[] => {
  const options = [];

  for (const [id, builder] of Object.entries(builderMap)) {
    const createdBuilder = builder();
    options.push({ value: id, text: createdBuilder.label });
  }

  return options;
};

const FormFieldsComponent: React.FC<FormFieldsProps> = ({ isSubmitting, isEditMode }) => {
  const [selectedType, setSelectedType] = useState<CustomFieldTypes>(CustomFieldTypes.TEXT);

  const handleTypeChange = useCallback(
    (e) => {
      setSelectedType(e.target.value);
    },
    [setSelectedType]
  );

  const builtCustomField = useMemo(() => {
    const builder = builderMap[selectedType];

    if (builder == null) {
      return null;
    }

    const customFieldBuilder = builder();

    return customFieldBuilder.build();
  }, [selectedType]);

  const Configure = builtCustomField?.Configure;
  const options = fieldTypeSelectOptions();

  return (
    <>
      <UseField path="key" component={HiddenField} />
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
            isLoading: isSubmitting,
            disabled: isEditMode,
          },
          onChange: handleTypeChange,
        }}
      />
      {Configure ? <Configure /> : null}
    </>
  );
};

FormFieldsComponent.displayName = 'FormFields';

export const FormFields = memo(FormFieldsComponent);
