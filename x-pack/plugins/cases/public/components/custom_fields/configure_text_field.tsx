/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import type { CustomFieldBuilder } from './types';
import { CustomFieldTypes } from './types';
import { FieldOptionsSelector } from './field_options/field_options_selector';

export const configureTextCustomFieldBuilder: CustomFieldBuilder = () => ({
  build: () => [
    {
      // eslint-disable-next-line react/display-name
      ConfigurePage: () => (
        <UseField
          path="fieldOptions"
          component={FieldOptionsSelector}
          componentProps={{
            dataTestSubj: 'text-custom-field-options',
            selectedType: CustomFieldTypes.TEXT,
          }}
        />
      ),
    },
  ],
});
