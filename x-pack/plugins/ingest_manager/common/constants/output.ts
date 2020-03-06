/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { OutputType } from '../types';

export const OUTPUT_SAVED_OBJECT_TYPE = 'outputs';

export const DEFAULT_OUTPUT_ID = 'default';

export const DEFAULT_OUTPUT = {
  name: DEFAULT_OUTPUT_ID,
  type: OutputType.Elasticsearch,
  hosts: [''],
  ingest_pipeline: DEFAULT_OUTPUT_ID,
  api_key: '',
};
