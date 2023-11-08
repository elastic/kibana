/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExclusiveUnion } from '@elastic/eui';
import type { TypeOf } from '@kbn/config-schema';
import type {
  CasesConnectorConfigSchema,
  CasesConnectorSecretsSchema,
  CasesConnectorParamsSchema,
} from './schema';

export type CasesConnectorConfig = TypeOf<typeof CasesConnectorConfigSchema>;
export type CasesConnectorSecrets = TypeOf<typeof CasesConnectorSecretsSchema>;
export type CasesConnectorParams = TypeOf<typeof CasesConnectorParamsSchema>;

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

interface OracleKeyAllRequired {
  ruleId: string;
  spaceId: string;
  owner: string;
  grouping: Record<string, string>;
}

type OracleKeyWithOptionalKey = Optional<OracleKeyAllRequired, 'ruleId'>;
type OracleKeyWithOptionalGrouping = Optional<OracleKeyAllRequired, 'grouping'>;

export type OracleKey = ExclusiveUnion<OracleKeyWithOptionalKey, OracleKeyWithOptionalGrouping>;

export interface OracleRecord {
  id: string;
  counter: number;
  cases: Array<{ id: string }>;
  grouping: Record<string, unknown>;
  rules: Array<{ id: string }>;
  createdAt: string;
  updatedAt: string | null;
  version: string;
}

export interface OracleRecordCreateRequest {
  cases: Array<{ id: string }>;
  rules: Array<{ id: string }>;
  grouping: Record<string, unknown>;
}
