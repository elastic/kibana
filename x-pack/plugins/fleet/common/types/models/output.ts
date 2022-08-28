/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { outputType } from '../../constants';
import type { ValueOf } from '..';

export type OutputType = typeof outputType;

export interface NewOutput {
  is_default: boolean;
  is_default_monitoring: boolean;
  is_preconfigured?: boolean;
  name: string;
  type: ValueOf<OutputType>;
  hosts?: string[];
  ca_sha256?: string | null;
  ca_trusted_fingerprint?: string | null;
  config_yaml?: string | null;
  ssl?: {
    certificate_authorities?: string[];
    certificate?: string;
    key?: string;
  } | null;
}

export type OutputSOAttributes = NewOutput & {
  output_id?: string;
  ssl?: string | null; // encrypted ssl field
};

export type Output = NewOutput & {
  id: string;
};
