/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewOutput } from '../types';

export const OUTPUT_SAVED_OBJECT_TYPE = 'ingest-outputs';

export const outputType = {
  Elasticsearch: 'elasticsearch',
  Logstash: 'logstash',
} as const;

export const DEFAULT_OUTPUT_ID = 'fleet-default-output';

export const DEFAULT_OUTPUT: NewOutput = {
  name: 'default',
  is_default: true,
  is_default_monitoring: true,
  type: outputType.Elasticsearch,
  hosts: [''],
};

export const LICENCE_FOR_PER_POLICY_OUTPUT = 'platinum';
