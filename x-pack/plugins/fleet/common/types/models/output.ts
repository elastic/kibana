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
  is_default_monitoring: boolean;
  name: string;
  type: ValueOf<OutputType>;
  hosts?: string[];
  ca_sha256?: string;
  api_key?: string;
  config_yaml?: string;
  is_preconfigured?: boolean;
}

export type OutputSOAttributes = NewOutput & {
  output_id?: string;
};

export type Output = NewOutput & {
  id: string;
};
