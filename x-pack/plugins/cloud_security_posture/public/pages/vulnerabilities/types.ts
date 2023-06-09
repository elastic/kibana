/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface VulnerabilityRecord {
  '@timestamp': string;
  resource?: {
    id: string;
    name: string;
  };
  event: {
    type: string[];
    category: string[];
    created: string;
    id: string;
    kind: string;
    sequence: number;
    outcome: string;
  };
  vulnerability: Vulnerability;
  ecs: {
    version: string;
  };
  host: {
    os: {
      name: string;
      kernel: string;
      codename: string;
      type: string;
      platform: string;
      version: string;
      family: string;
    };
    id: string;
    name: string;
    containerized: boolean;
    ip: string[];
    mac: string[];
    hostname: string;
    architecture: string;
  };
  agent: {
    ephemeral_id: string;
    id: string;
    name: string;
    type: string;
    version: string;
  };
  cloud: {
    image: {
      id: string;
    };
    provider: string;
    instance: {
      id: string;
    };
    machine: {
      type: string;
    };
    region: string;
    availability_zone: string;
    service: {
      name: string;
    };
    account: {
      id: string;
    };
  };
  cloudbeat: {
    version: string;
    commit_sha: string;
    commit_time: string;
  };
}

export interface Vulnerability {
  published_date: string;
  score: {
    version: string;
    base: number;
  };
  cwe: string[];
  id: string;
  title: string;
  reference: string;
  severity: string;
  cvss: {
    nvd: VectorScoreBase;
    redhat?: VectorScoreBase;
    ghsa?: VectorScoreBase;
  };
  data_source: {
    ID: string;
    Name: string;
    URL: string;
  };
  enumeration: string;
  description: string;
  classification: string;
  scanner: {
    vendor: string;
  };
  package: {
    version: string;
    name: string;
    fixed_version?: string;
  };
}

export interface VectorScoreBase {
  V3Score?: number;
  V3Vector?: string;
  V2Score?: number;
  V2Vector?: string;
}

export type Vendor = 'NVD' | 'Red Hat' | 'GHSA';

export interface CVSScoreProps {
  vectorBaseScore: VectorScoreBase;
  vendor: string;
}

export interface Vector {
  version: string;
  vector: string;
  score: number | undefined;
}
