/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { outputType } from '../../constants';
import type { ValueOf } from '../index';

export type OutputType = typeof outputType;

export interface NewOutput {
  is_default: boolean;
  name: string;
  type: ValueOf<OutputType>;
  hosts?: string[];
  ca_sha256?: string;
  api_key?: string;
  fleet_enroll_username?: string;
  fleet_enroll_password?: string;
  config?: Record<string, any>;
  config_yaml?: string;
}

export type OutputSOAttributes = NewOutput;

export type Output = NewOutput & {
  id: string;
};
