/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIELD_TYPES, FormSchema } from '../../shared_imports';

export const formSchema: FormSchema = {
  agents: {
    type: FIELD_TYPES.MULTI_SELECT,
  },
  query: {
    type: FIELD_TYPES.TEXTAREA,
    validations: [],
  },
};
