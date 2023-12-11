/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { VectorScoreBase, CspVulnerabilityFinding } from '../../../common/schemas';

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

export interface VulnerabilitiesQueryData {
  page: CspVulnerabilityFinding[];
  total: number;
}

export interface VulnerabilitiesByResourceQueryData {
  page: Array<{
    resource: {
      id: string;
      name: string;
    };
    cloud: {
      region: string;
    };
    vulnerabilities_count: number;
    severity_map: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  }>;
  total: number;
  total_vulnerabilities: number;
}
