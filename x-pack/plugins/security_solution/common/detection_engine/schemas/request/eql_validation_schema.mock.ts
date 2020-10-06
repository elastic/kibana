/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EqlValidationSchema } from './eql_validation_schema';

export const getEqlValidationSchemaMock = (): EqlValidationSchema => ({
  index: ['index-123'],
  query: 'process where process.name == "regsvr32.exe"',
});
