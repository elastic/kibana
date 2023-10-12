/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type {
  CasesConnectorConfigSchema,
  CasesConnectorSecretsSchema,
  CasesConnectorParamsSchema,
} from './schema';

export type CasesConnectorConfig = TypeOf<typeof CasesConnectorConfigSchema>;
export type CasesConnectorSecrets = TypeOf<typeof CasesConnectorSecretsSchema>;
export type CasesConnectorParams = TypeOf<typeof CasesConnectorParamsSchema>;

export interface OracleKey {
  ruleId?: string;
  spaceId: string;
  owner: string;
  grouping?: Record<string, string>;
}

export interface OracleRecord {
  id: string;
  counter: number;
  caseIds: string[];
  ruleId: string;
  createdAt: string;
  updatedAt: string;
}

export type OracleRecordCreateRequest = {
  caseIds: string[];
} & OracleKey;
