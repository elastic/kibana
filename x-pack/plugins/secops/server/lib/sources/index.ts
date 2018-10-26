/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export { ConfigurationSourcesAdapter } from './configuration_sources_adapter';

export class Sources {
  constructor(private readonly adapter: SourcesAdapter) {}

  public async getConfiguration(sourceId: string) {
    const sourceConfigurations = await this.getAllConfigurations();
    const requestedSourceConfiguration = sourceConfigurations[sourceId];

    if (!requestedSourceConfiguration) {
      throw new Error(`Failed to find source '${sourceId}'`);
    }

    return requestedSourceConfiguration;
  }

  public getAllConfigurations() {
    return this.adapter.getAll();
  }
}

export interface SourcesAdapter {
  getAll(): Promise<SourceConfigurations>;
}

export interface SourceConfigurations {
  [sourceId: string]: SourceConfiguration;
}

export interface SourceConfiguration {
  fields: {
    container: string;
    host: string;
    message: string[];
    pod: string;
    tiebreaker: string;
    timestamp: string;
  };
}
