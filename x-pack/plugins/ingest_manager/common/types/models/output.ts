/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum OutputType {
  Elasticsearch = 'elasticsearch',
}

export interface NewOutput {
  is_default: boolean;
  name: string;
  type: OutputType;
  hosts?: string[];
  ca_sha256?: string;
  api_key?: string;
  fleet_enroll_username?: string;
  fleet_enroll_password?: string;
  config?: Record<string, any>;
}

export type OutputSOAttributes = NewOutput;

export type Output = NewOutput & {
  id: string;
};
