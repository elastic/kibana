/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

export class InfraSources {
  constructor(private readonly adapter: InfraSourcesAdapter) {}

  public async getConfiguration(sourceId: string) {
    const sourceConfigurations = await this.getAllConfigurations();
    const requestedSourceConfiguration = sourceConfigurations[sourceId];

    if (!requestedSourceConfiguration) {
      throw new Error(
        i18n.translate('xpack.infra.infraSources.failedToFindSourceErrorMessage', {
          defaultMessage: 'Failed to find source {sourceId}',
          values: {
            sourceId: `'${sourceId}'`,
          },
        })
      );
    }

    return requestedSourceConfiguration;
  }

  public getAllConfigurations() {
    return this.adapter.getAll();
  }
}

export interface InfraSourcesAdapter {
  getAll(): Promise<InfraSourceConfigurations>;
}

export interface InfraSourceConfigurations {
  [sourceId: string]: InfraSourceConfiguration;
}

export interface InfraSourceConfiguration {
  metricAlias: string;
  logAlias: string;
  fields: {
    container: string;
    host: string;
    message: string[];
    pod: string;
    tiebreaker: string;
    timestamp: string;
  };
}
