/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: this needs to be defined in a versioned schema
import type { EcsEvent } from '@elastic/ecs';
import { CspBenchmarkRuleMetadata } from '../types/latest';

export interface CspFindingBase {
  '@timestamp': string;
  cluster_id: string;
  result: CspFindingResult;
  resource: CspFindingResource;
  rule: CspBenchmarkRuleMetadata;
  host: CspFindingHost;
  event: EcsEvent;
  agent: CspFindingAgent;
  ecs: {
    version: string;
  };
}

export interface CspFindingCSPM extends CspFindingBase {
  cloud: CspFindingCloud;
  rule: CspBenchmarkRuleMetadata & {
    benchmark: {
      name: string;
      id: string;
      version: string;
      rule_number: string | undefined;
      posture_type: 'cspm';
    };
  };
}

export interface CspFindingKSPM extends CspFindingBase {
  orchestrator: CspFindingOrchestrator;
  rule: CspBenchmarkRuleMetadata & {
    benchmark: {
      name: string;
      id: string;
      version: string;
      rule_number: string | undefined;
      posture_type: 'kspm';
    };
  };
}

export type CspFinding = CspFindingCSPM | CspFindingKSPM;

export interface CspFindingOrchestrator {
  cluster?: {
    id?: string;
    name?: string;
  };
}

export interface CspFindingCloud {
  provider: 'aws';
  account: {
    name: string;
    id: string;
  };
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
