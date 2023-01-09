/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: this needs to be defined in a versioned schema
import type { EcsEvent } from '@kbn/ecs';
import type { CspRuleTemplateMetadata } from './csp_rule_template_metadata';

export interface CspFinding {
  '@timestamp': string;
  cluster_id: string;
  orchestrator?: {
    cluster?: {
      name?: string;
    };
  };
  result: CspFindingResult;
  resource: CspFindingResource;
  rule: CspRuleTemplateMetadata;
  host: CspFindingHost;
  event: EcsEvent;
  agent: CspFindingAgent;
  ecs: {
    version: string;
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
