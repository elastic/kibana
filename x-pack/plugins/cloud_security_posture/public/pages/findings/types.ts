/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  description: string;
  impact: string;
  name: string;
  remediation: string;
  tags: string[];
}

interface CspFindingResult {
  evaluation: 'passed' | 'failed';
  evidence: {
    filemode: string;
  };
}

interface CspFindingResource {
  uid: string;
  filename: string;
  // gid: string;
  mode: string;
  path: string;
  type: string;
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
}

interface CspFindingAgent {
  version: string;
  // ephemeral_id: string;
  id: string;
  name: string;
  type: string;
}
