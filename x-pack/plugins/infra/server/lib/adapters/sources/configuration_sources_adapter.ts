/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraSourceConfigurations, InfraSourcesAdapter } from '../../sources';
import { InfraConfigurationAdapter } from '../configuration';
import { PartialInfraSourceConfigurations } from './adapter_types';

interface ConfigurationWithSources {
  sources?: PartialInfraSourceConfigurations;
}

export class InfraConfigurationSourcesAdapter implements InfraSourcesAdapter {
  private readonly configuration: InfraConfigurationAdapter<ConfigurationWithSources>;

  constructor(configuration: InfraConfigurationAdapter<ConfigurationWithSources>) {
    this.configuration = configuration;
  }

  public async getAll() {
    const sourceConfigurations = (await this.configuration.get()).sources || {
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
