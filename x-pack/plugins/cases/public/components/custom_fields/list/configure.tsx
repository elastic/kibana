/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isEqual } from 'lodash';
import type { EuiSelectOption } from '@elastic/eui';
import { CheckBoxField, SelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { UseField, useFormContext } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import React, { useCallback, useState, useEffect } from 'react';
import type { CaseCustomFieldList } from '../../../../common/types/domain';
import * as i18n from '../translations';
import type { CustomFieldType } from '../types';
import { OptionsField, INITIAL_OPTIONS } from './components/options_field';
import { getListFieldConfig } from './config';

const ConfigureComponent: CustomFieldType<CaseCustomFieldList>['Configure'] = () => {
  const config = getListFieldConfig({
    required: false,
    label: i18n.DEFAULT_VALUE.toLocaleLowerCase(),
  });
  const [currentOptions, setCurrentOptions] = useState<EuiSelectOption[]>(INITIAL_OPTIONS);

  // On edit, initialize the options so the default value can be displayed
  const form = useFormContext();
  const fields = form.getFields();
  useEffect(() => {
    if (isEqual(currentOptions, INITIAL_OPTIONS) && fields.options?.value) {
      setCurrentOptions(fields.options?.value as EuiSelectOption[]);
    }
  }, [currentOptions, fields]);

  return (
    <>
      <UseField
        path="options"
        component={OptionsField}
        componentProps={{
          label: 'Values',
          euiFieldProps: {
            'data-test-subj': 'list-custom-field-values',
          },
        }}
        onChange={useCallback((options: EuiSelectOption[]) => {
          setCurrentOptions(options);
        }, [])}
      />
      <UseField
        path="required"
        component={CheckBoxField}
        componentProps={{
          label: i18n.FIELD_OPTIONS,
          'data-test-subj': 'list-custom-field-required-wrapper',
          euiFieldProps: {
            label: i18n.FIELD_OPTION_REQUIRED,
            'data-test-subj': 'list-custom-field-required',
          },
        }}
      />
      <UseField
        path="defaultValue"
        component={SelectField}
        config={config}
        componentProps={{
          label: i18n.DEFAULT_VALUE,
          euiFieldProps: {
            'data-test-subj': 'list-custom-field-default-value',
            options: currentOptions,
          },
        }}
      />
    </>
  );
};

ConfigureComponent.displayName = 'Configure';

export const Configure = React.memo(ConfigureComponent);
