/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export interface AccountsBucket {
  accounts: {
    buckets: AccountEntity[];
  };
}

export interface AccountEntity {
  key: string; // account_id
  doc_count: number;
  resource_type?: {
    buckets: ResourceType[];
  };
}

export interface ResourceType {
  key: string;
  doc_count: number;
  evaluation: { buckets: StatsEntity[] };
}

export interface StatsEntity {
  key: string;
  doc_count: number;
  agents: Agents;
}
export interface Agents {
  value: number;
}

export interface ResourceStats {
  [key: string]: {
    doc_count: number;
    passed: number;
    failed: number;
  };
}
