/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EqlValidationSchema } from './eql_validation_schema';

export const getEqlValidationResponseMock = (): EqlValidationSchema => ({
  valid: false,
  errors: ['line 3:52: token recognition error at: '],
});
