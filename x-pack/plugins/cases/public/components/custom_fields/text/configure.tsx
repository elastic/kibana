/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UseField, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { CheckBoxField, TextField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { CaseCustomFieldText } from '../../../../common/types/domain';
import type { CustomFieldType } from '../types';
import * as i18n from '../translations';

const ConfigureComponent: CustomFieldType<CaseCustomFieldText>['Configure'] = () => {
  const [{ required, defaultValue }] = useFormData();

  return (
    <>
      <UseField
        path="required"
        component={CheckBoxField}
        componentProps={{
          label: i18n.FIELD_OPTIONS,
          'data-test-subj': 'text-custom-field-required-wrapper',
          euiFieldProps: {
            label: i18n.FIELD_OPTION_REQUIRED,
            'data-test-subj': 'text-custom-field-required',
          },
        }}
      />
      {required && (
        <UseField
          path="defaultValue"
          component={TextField}
          componentProps={{
            label: i18n.DEFAULT_VALUE,
            euiFieldProps: {
              'data-test-subj': 'text-custom-field-default-value',
            },
          }}
          defaultValue={defaultValue}
        />
      )}
    </>
  );
};

ConfigureComponent.displayName = 'Configure';

export const Configure = React.memo(ConfigureComponent);
