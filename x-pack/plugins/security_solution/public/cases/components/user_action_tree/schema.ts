/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FIELD_TYPES, fieldValidators, FormSchema } from '../../../shared_imports';
import * as i18n from '../../translations';

const { emptyField } = fieldValidators;
export interface Content {
  content: string;
}
export const schema: FormSchema<Content> = {
  content: {
    type: FIELD_TYPES.TEXTAREA,
    validations: [
      {
        validator: emptyField(i18n.REQUIRED_FIELD),
      },
    ],
  },
};
