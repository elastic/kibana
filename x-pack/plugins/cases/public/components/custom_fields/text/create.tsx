/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { TextField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { CaseCustomFieldText } from '../../../../common/types/domain';
import type { CustomFieldType } from '../types';
import { getTextFieldConfig } from './config';

const CreateComponent: CustomFieldType<CaseCustomFieldText>['Create'] = ({
  customFieldConfiguration,
  isLoading,
}) => {
  const { key, label, required, defaultValue } = customFieldConfiguration;
  const config = getTextFieldConfig({
    required,
    label,
    ...(defaultValue && { defaultValue: String(defaultValue) }),
  });

  return (
    <UseField
      path={`customFields.${key}`}
      config={config}
      component={TextField}
      label={label}
      componentProps={{
        euiFieldProps: {
          'data-test-subj': `${key}-text-create-custom-field`,
          fullWidth: true,
          disabled: isLoading,
          isLoading,
        },
      }}
    />
  );
};

CreateComponent.displayName = 'Create';

export const Create = React.memo(CreateComponent);
