/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum OutputType {
  Elasticsearch = 'elasticsearch',
}

interface OutputBaseSchema {
  name: string;
  type: OutputType;
  username?: string;
  password?: string;
  index_name?: string;
  ingest_pipeline?: string;
  hosts?: string[];
  api_key?: string;
  admin_username?: string;
  admin_password?: string;
  config?: Record<string, any>;
}

export type NewOutputSchema = OutputBaseSchema;

export type OutputSchema = OutputBaseSchema & {
  id: string;
};

export type NewOutput = NewOutputSchema;

export type Output = OutputSchema;
