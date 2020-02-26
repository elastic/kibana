/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum OutputType {
  Elasticsearch = 'elasticsearch',
}

export interface NewOutput {
  name: string;
  type: OutputType;
  hosts?: string[];
  api_key?: string;
  admin_username?: string;
  admin_password?: string;
  config?: Record<string, any>;
}

export type Output = NewOutput & {
  id: string;
};
