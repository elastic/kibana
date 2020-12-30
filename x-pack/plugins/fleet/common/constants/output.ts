/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { NewOutput } from '../types';

export const OUTPUT_SAVED_OBJECT_TYPE = 'ingest-outputs';

export const outputType = {
  Elasticsearch: 'elasticsearch',
} as const;

export const DEFAULT_OUTPUT: NewOutput = {
  name: 'default',
  is_default: true,
  type: outputType.Elasticsearch,
  hosts: [''],
};
