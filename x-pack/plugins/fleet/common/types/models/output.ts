/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { outputType } from '../../constants';
import type { ValueOf } from '../index';

export type OutputType = typeof outputType;

export interface NewOutput {
  is_default: boolean;
  name: string;
  type: ValueOf<OutputType>;
  hosts?: string[];
  ca_sha256?: string;
  api_key?: string;
  config?: Record<string, any>;
  config_yaml?: string;
}

export type OutputSOAttributes = NewOutput;

export type Output = NewOutput & {
  id: string;
};
