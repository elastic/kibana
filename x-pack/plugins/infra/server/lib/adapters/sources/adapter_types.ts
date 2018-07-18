/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface InfraSourcesAdapter {
  get(sourceId: string): Promise<InfraSourceConfiguration>;
  getAll(): Promise<{
    [sourceId: string]: InfraSourceConfiguration;
  }>;
}

export interface InfraSourceConfiguration {
  metricAlias: string;
  logAlias: string;
  fields: {
    container: string;
    hostname: string;
    message: string[];
    pod: string;
    tiebreaker: string;
    timestamp: string;
  };
}
