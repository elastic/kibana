/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { FieldOptionsSelector } from './field_options/field_options_selector';
import type { CustomFieldBuilderArgs, CustomFieldBuilder } from './types';

export const createCommonCustomFieldBuilder = ({
  customFieldType,
  component,
  componentProps,
}: CustomFieldBuilderArgs): ReturnType<CustomFieldBuilder> => {
  return {
    build: () => [
      {
        customFieldType: component ? (
          <UseField
            path={`${customFieldType}`}
            component={component}
            componentProps={{
              ...componentProps,
              customFieldType,
              dataTestSubj: `${customFieldType}-custom-field`,
            }}
          />
        ) : null,
        fieldOptions: (
          <UseField
            path="fieldOptions"
            component={FieldOptionsSelector}
            componentProps={{
              dataTestSubj: 'fieldOptions',
              selectedType: customFieldType,
            }}
          />
        ),
      },
    ],
  };
};
