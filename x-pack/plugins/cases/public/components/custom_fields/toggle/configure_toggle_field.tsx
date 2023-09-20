/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { CheckBoxField } from '@kbn/es-ui-shared-plugin/static/forms/components';

import type { CustomFieldBuilder } from '../types';
import { CustomFieldTypes } from '../../../../common/types/domain';
import * as i18n from '../translations';

export const configureToggleCustomFieldBuilder: CustomFieldBuilder = () => ({
  id: CustomFieldTypes.TOGGLE,
  label: i18n.TOGGLE_LABEL,
  build: () => ({
    // eslint-disable-next-line react/display-name
    ConfigurePage: () => (
      <>
        <UseField
          path="options.required"
          component={CheckBoxField}
          componentProps={{
            euiFieldProps: {
              'data-test-subj': 'toggle-custom-field-options',
              label: i18n.FIELD_OPTION_REQUIRED,
            },
            label: i18n.FIELD_OPTIONS,
          }}
        />
      </>
    ),
  }),
});
