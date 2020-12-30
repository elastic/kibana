/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormSchema, FIELD_TYPES } from '../../../shared_imports';

export interface FormProps {
  connectorId: string;
}

export const schema: FormSchema<FormProps> = {
  connectorId: {
    type: FIELD_TYPES.SUPER_SELECT,
  },
};
