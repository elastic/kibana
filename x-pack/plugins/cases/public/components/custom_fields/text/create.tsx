/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { TextField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { CustomFieldType } from '../types';
import { getTextFieldConfig } from './config';


const CreateComponent: CustomFieldType['Create'] = ({
  customFieldConfiguration,
  isLoading,
}) => {
  const {key, label, required} = customFieldConfiguration;
  const config = getTextFieldConfig({required, label});

  return (
    <UseField
      path={key}
      config={config}
      component={TextField}
      componentProps={{
        label,
        euiFieldProps: {
          'data-test-subj': `${label}-text-create-custom-field`,
          fullWidth: true,
          disabled: isLoading,
          isLoading,
        }
      }}
    />
)
};

CreateComponent.displayName = 'Create';

export const Create = React.memo(CreateComponent);
