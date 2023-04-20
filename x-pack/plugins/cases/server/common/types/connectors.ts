/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ConnectorFieldsPersistedAttributes = Array<{
  key: string;
  value: unknown;
}>;

export interface ConnectorPersistedAttributes {
  name: string;
  type: string;
  fields: ConnectorFieldsPersistedAttributes | null;
}
