/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AggBucket {
  key: string;
}

export interface EntityService {
  name: string;
  environment?: string;
  version: string;
  runtime: {
    name: string;
    version: number;
  };
  framework: string;
  agent: {
    name: string;
    version: number;
  };
}

export interface EntityServiceInfrastructure {
  containerIds: string[];
  hostNames: string[];
  podNames: string[];
}
