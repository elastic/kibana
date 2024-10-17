/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { DatePickerField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { i18n } from '@kbn/i18n';
import type { CaseCustomFieldDate } from '../../../../common/types/domain';
import type { CustomFieldType } from '../types';
import { getDateFieldConfig } from './config';
import { OptionalFieldLabel } from '../../optional_field_label';

const CreateComponent: CustomFieldType<CaseCustomFieldDate>['Create'] = ({
  customFieldConfiguration,
  isLoading,
  setAsOptional,
  setDefaultValue = true,
}) => {
  const { key, label, required, defaultValue } = customFieldConfiguration;
  const config = getDateFieldConfig({
    required: setAsOptional ? false : required,
    label,
    ...(defaultValue && setDefaultValue && { defaultValue: String(defaultValue) }),
  });

  return (
    <UseField
      path={`customFields.${key}`}
      config={config}
      component={DatePickerField}
      label={label}
      componentProps={{
        labelAppend: setAsOptional ? OptionalFieldLabel : null,
        'data-test-subj': `${key}-date-create-custom-field`,
        euiFieldProps: {
          fullWidth: true,
          disabled: isLoading,
          isLoading,
          showTimeSelect: true,
          clearable: true,
          locale: i18n.getLocale(),
        },
      }}
    />
  );
};

CreateComponent.displayName = 'Create';

export const Create = React.memo(CreateComponent);
