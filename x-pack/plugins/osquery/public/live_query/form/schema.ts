/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FIELD_TYPES, FormSchema } from '../../shared_imports';

export const formSchema: FormSchema = {
  agents: {
    type: FIELD_TYPES.MULTI_SELECT,
  },
  command: {
    type: FIELD_TYPES.TEXTAREA,
    validations: [],
  },
};
