/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { CheckBoxField, DatePickerField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { i18n } from '@kbn/i18n';
import type { CaseCustomFieldDate } from '../../../../common/types/domain';
import type { CustomFieldType } from '../types';
import { getDateFieldConfig } from './config';
import { DEFAULT_VALUE, FIELD_OPTIONS, FIELD_OPTION_REQUIRED } from '../translations';

const ConfigureComponent: CustomFieldType<CaseCustomFieldDate>['Configure'] = () => {
  const config = getDateFieldConfig({
    required: false,
    label: DEFAULT_VALUE.toLocaleLowerCase(),
  });

  return (
    <>
      <UseField
        path="required"
        component={CheckBoxField}
        componentProps={{
          label: FIELD_OPTIONS,
          'data-test-subj': 'date-custom-field-required-wrapper',
          euiFieldProps: {
            label: FIELD_OPTION_REQUIRED,
            'data-test-subj': 'date-custom-field-required',
          },
        }}
      />
      <UseField
        path="defaultValue"
        component={DatePickerField}
        config={config}
        componentProps={{
          label: DEFAULT_VALUE,
          euiFieldProps: {
            'data-test-subj': 'date-custom-field-default-value',
            showTimeSelect: true,
            fullWidth: true,
            locale: i18n.getLocale(),
            placeholder: 'Select a date',
          },
        }}
      />
    </>
  );
};

ConfigureComponent.displayName = 'Configure';

export const Configure = React.memo(ConfigureComponent);
