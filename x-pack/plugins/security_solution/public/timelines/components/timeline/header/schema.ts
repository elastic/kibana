/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FIELD_TYPES, FormSchema, fieldValidators } from '../../../../shared_imports';

export const formSchema: FormSchema = {
  title: {
    type: FIELD_TYPES.TEXT,
    validations: [
      {
        validator: fieldValidators.emptyField(''),
      },
    ],
  },
  description: {
    type: FIELD_TYPES.TEXTAREA,
    validations: [],
  },
};
