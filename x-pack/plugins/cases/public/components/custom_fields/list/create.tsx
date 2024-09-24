/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { UseField, useFormContext } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { CaseCustomFieldList } from '../../../../common/types/domain';
import type { CustomFieldType } from '../types';
import { getListFieldConfig } from './config';
import { OptionalFieldLabel } from '../../optional_field_label';
import { MappedSelectField } from './components/mapped_select_field';

const CreateComponent: CustomFieldType<CaseCustomFieldList>['Create'] = ({
  customFieldConfiguration,
  isLoading,
  setAsOptional,
  setDefaultValue = true,
}) => {
  const { key, label, required, defaultValue, options } = customFieldConfiguration;

  const [selectedOptionKey, setSelectedOptionKey] = useState<string | null>(
    defaultValue && setDefaultValue ? String(defaultValue) : null
  );
  const form = useFormContext();
  console.log('FORM', form, form.getFields());

  const config = getListFieldConfig({
    required: setAsOptional ? false : required,
    label,
    ...(defaultValue && setDefaultValue && { defaultValue: String(defaultValue) }),
  });

  return (
    <UseField
      path={`customFields.${key}.${selectedOptionKey}`}
      config={config}
      component={MappedSelectField}
      label={label}
      componentProps={{
        labelAppend: setAsOptional ? OptionalFieldLabel : null,
        onChangeKey: (newKey: string) => setSelectedOptionKey(newKey),
        euiFieldProps: {
          'data-test-subj': `${key}-list-create-custom-field`,
          fullWidth: true,
          disabled: isLoading,
          isLoading,
          options,
        },
      }}
    />
  );
};

CreateComponent.displayName = 'Create';

export const Create = React.memo(CreateComponent);
