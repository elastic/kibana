/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Weather {
  accounts: Accounts;
}
export interface Accounts {
  buckets?: AccountEntity[] | null;
}
export interface AccountEntity {
  key: string; // account_id
  doc_count: number;
  resource_type?: ResourceEntity | null;
}

export interface ResourceEntity {
  buckets: ResourceType[];
}

// export interface ResourceType {
//   buckets?: EvaluationEntity[] | null;
// }

export interface ResourceType {
  key: string;
  doc_count: number;
  evaluation: Evaluation;
}
export interface Evaluation {
  buckets?: StatsEntity[] | null;
}
export interface StatsEntity {
  key: string;
  doc_count: number;
  agents: Agents;
}
export interface Agents {
  value: number;
}
