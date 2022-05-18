/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { BoolQuery, Filter, Query } from '@kbn/es-query';
import { UseQueryResult } from 'react-query';

export type FindingsGroupByKind = 'default' | 'resource';

export interface FindingsBaseURLQuery {
  query: Query;
  filters: Filter[];
}

export interface FindingsBaseEsQuery {
  index: string;
  query?: {
    bool: BoolQuery;
  };
}

export interface FindingsQueryResult<TData = unknown, TError = unknown> {
  loading: UseQueryResult['isLoading'];
  error: TError;
  data: TData;
}

// TODO: this needs to be defined in a versioned schema
export interface CspFinding {
  '@timestamp': string;
  cycle_id: string;
  result: CspFindingResult;
  resource: CspFindingResource;
  rule: CspRule;
  host: CspFindingHost;
  agent: CspFindingAgent;
  ecs: {
    version: string;
  };
}

interface CspRule {
  benchmark: { name: string; version: string };
  section: string;
  audit: string;
  references: string;
  profile_applicability: string;
  description: string;
  impact: string;
  default_value: string;
  rationale: string;
  name: string;
  remediation: string;
  tags: string[];
}

interface CspFindingResult {
  evaluation: 'passed' | 'failed';
  expected?: Record<string, unknown>;
  evidence: Record<string, unknown>;
}

interface CspFindingResource {
  name: string;
  sub_type: string;
  raw: object;
  id: string;
  type: string;
  [other_keys: string]: unknown;
}

interface CspFindingHost {
  id: string;
  containerized: boolean;
  ip: string[];
  mac: string[];
  name: string;
  hostname: string;
  architecture: string;
  os: {
    kernel: string;
    codename: string;
    type: string;
    platform: string;
    version: string;
    family: string;
    name: string;
  };
  [other_keys: string]: unknown;
}

interface CspFindingAgent {
  version: string;
  // ephemeral_id: string;
  id: string;
  name: string;
  type: string;
}
