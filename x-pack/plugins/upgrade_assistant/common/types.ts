/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

type MIGRATION_DEPRECATION_LEVEL = 'warning' | 'critical';

export interface DeprecationInfo {
  level: MIGRATION_DEPRECATION_LEVEL;
  message: string;
  url: string;
  details?: string;
}

export interface DeprecationAPIResponse {
  cluster_settings: DeprecationInfo[];
  node_settings: DeprecationInfo[];
  index_settings: {
    [indexName: string]: DeprecationInfo[];
  };
}
