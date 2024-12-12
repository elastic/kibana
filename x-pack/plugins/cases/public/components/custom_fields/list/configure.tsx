/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isEqual } from 'lodash';
import { CheckBoxField, SelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { UseField, useFormContext } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import React, { useCallback, useState, useEffect, useMemo } from 'react';
import type { CaseCustomFieldList, ListCustomFieldOption } from '../../../../common/types/domain';
import * as i18n from '../translations';
import type { CustomFieldType } from '../types';
import { OptionsField, INITIAL_OPTIONS } from './components/options_field';
import { getListFieldConfig } from './config';
import { listCustomFieldOptionsToEuiSelectOptions } from './helpers/list_custom_field_options_to_eui_select_options';

const ConfigureComponent: CustomFieldType<CaseCustomFieldList>['Configure'] = () => {
  const config = getListFieldConfig({
    required: false,
    label: i18n.DEFAULT_VALUE.toLocaleLowerCase(),
  });
  const [hasInitialized, setHasInitialized] = useState(false);
  const [currentOptions, setCurrentOptions] = useState<ListCustomFieldOption[]>(INITIAL_OPTIONS);
  const currentEuiSelectOptions = useMemo(
    () => listCustomFieldOptionsToEuiSelectOptions(currentOptions),
    [currentOptions]
  );

  // On edit, initialize the options so the default value can be displayed
  const form = useFormContext();
  const fields = form.getFields();
  useEffect(() => {
    if (isEqual(currentOptions, INITIAL_OPTIONS) && fields.options?.value) {
      setCurrentOptions(fields.options?.value as ListCustomFieldOption[]);
    }
    setHasInitialized(true);
  }, [currentOptions, fields]);

  // Clear default value if it's removed from the options list
  useEffect(() => {
    if (
      hasInitialized &&
      fields.defaultValue?.value &&
      !currentOptions.find((o) => o.key === fields.defaultValue?.value)
    ) {
      fields.defaultValue.setValue('');
    }
  }, [currentOptions, fields, hasInitialized]);

  return (
    <>
      <UseField
        path="options"
        component={OptionsField}
        componentProps={{
          label: 'Values',
          maxOptions: 10,
          'data-test-subj': 'list-custom-field-values',
        }}
        onChange={useCallback((options: ListCustomFieldOption[]) => {
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
            options: currentEuiSelectOptions,
          },
        }}
      />
    </>
  );
};

ConfigureComponent.displayName = 'Configure';

export const Configure = React.memo(ConfigureComponent);
