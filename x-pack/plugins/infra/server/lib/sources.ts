/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { InfraConfigurationAdapter } from './adapters/configuration';
import { InfraFrameworkRequest } from './adapters/framework';
import { PartialInfraSourceConfigurations } from './adapters/sources/adapter_types';

interface ConfigurationWithSources {
  sources?: PartialInfraSourceConfigurations;
}

export class InfraSources {
  constructor(
    private readonly staticConfiguration: InfraConfigurationAdapter<ConfigurationWithSources>
  ) {}

  public async getSourceConfiguration(request: InfraFrameworkRequest, sourceId: string) {
    const sourceConfigurations = await this.getAllSourceConfigurations();
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

  public async getAllSourceConfigurations() {
    const sourceConfigurations = (await this.staticConfiguration.get()).sources || {
      default: DEFAULT_SOURCE,
    };
    const sourceConfigurationsWithDefault = {
      ...sourceConfigurations,
      default: {
        ...DEFAULT_SOURCE,
        ...(sourceConfigurations.default || {}),
      },
    } as PartialInfraSourceConfigurations;

    return Object.entries(sourceConfigurationsWithDefault).reduce<InfraSourceConfigurations>(
      (result, [sourceId, sourceConfiguration]) =>
        ({
          ...result,
          [sourceId]: {
            ...sourceConfiguration,
            fields: {
              ...DEFAULT_FIELDS,
              ...(sourceConfiguration.fields || {}),
            },
          },
        } as InfraSourceConfigurations),
      {}
    );
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

const DEFAULT_FIELDS = {
  container: 'docker.container.name',
  host: 'beat.hostname',
  message: ['message', '@message'],
  pod: 'kubernetes.pod.name',
  tiebreaker: '_doc',
  timestamp: '@timestamp',
};

const DEFAULT_SOURCE = {
  metricAlias: 'metricbeat-*',
  logAlias: 'filebeat-*',
  fields: DEFAULT_FIELDS,
};
