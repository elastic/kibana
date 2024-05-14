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
import { OptionalFieldLabel } from '../../create/optional_field_label';

const CreateComponent: CustomFieldType<CaseCustomFieldText>['Create'] = ({
  customFieldConfiguration,
  isLoading,
  path,
  setAsOptional,
}) => {
  const { key, label, required, defaultValue } = customFieldConfiguration;
  const config = getTextFieldConfig({
    required: setAsOptional ? false : required,
    label,
    ...(defaultValue && { defaultValue: String(defaultValue) }),
  });

  const newPath = path ?? 'customFields';

  return (
    <UseField
      path={`${newPath}.${key}`}
      config={config}
      component={TextField}
      label={label}
      componentProps={{
        euiFieldProps: {
          'data-test-subj': `${key}-text-create-custom-field`,
          fullWidth: true,
          disabled: isLoading,
          isLoading,
          labelAppend: setAsOptional ? OptionalFieldLabel : null,
        },
      }}
    />
  );
};

CreateComponent.displayName = 'Create';

export const Create = React.memo(CreateComponent);
