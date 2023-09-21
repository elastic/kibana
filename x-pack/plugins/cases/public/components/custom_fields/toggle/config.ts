/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldConfig } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  REQUIRED_FIELD,
} from '../translations';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';

const { emptyField } = fieldValidators;

export const getToggleFieldConfig = ({
  required,
  label,
}: {
  required: boolean;
  label: string;
}): FieldConfig<string> => {
  const validators = [];

  if (required) {
    validators.push({
      validator: emptyField(REQUIRED_FIELD(label)),
    });
  }

  return {
    validations: [
      ...validators,
    ],
  };
};
