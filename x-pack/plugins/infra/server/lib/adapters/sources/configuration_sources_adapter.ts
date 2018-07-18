/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraConfiguration } from '../../infra_types';
import { InfraConfigurationAdapter } from '../configuration';
import { InfraSourceConfiguration, InfraSourcesAdapter } from './adapter_types';

export class InfraConfigurationSourcesAdapter implements InfraSourcesAdapter {
  private readonly configuration: InfraConfigurationAdapter<InfraConfiguration>;

  constructor(configuration: InfraConfigurationAdapter<InfraConfiguration>) {
    this.configuration = configuration;
  }

  public async get(sourceId: string) {
    const sourceConfigurations = await this.getAll();
    const requestedSourceConfiguration = sourceConfigurations[sourceId];

    if (!requestedSourceConfiguration) {
      throw new Error(`Failed to find source '${sourceId}'`);
    }

    return requestedSourceConfiguration;
  }

  public async getAll() {
    const sourceConfigurations = (await this.configuration.get()).sources;
    const sourceConfigurationsWithDefault = {
      ...sourceConfigurations,
      default: {
        ...DEFAULT_SOURCE,
        ...(sourceConfigurations.default || {}),
      },
    };

    return Object.entries(sourceConfigurationsWithDefault).reduce<{
      [sourceId: string]: InfraSourceConfiguration;
    }>(
      (result, [sourceId, sourceConfiguration]) => ({
        ...result,
        [sourceId]: {
          ...sourceConfiguration,
          fields: {
            ...DEFAULT_FIELDS,
            ...sourceConfiguration.fields,
          },
        },
      }),
      {}
    );
  }
}

const DEFAULT_FIELDS = {
  container: 'docker.container.name',
  hostname: 'beat.hostname',
  message: ['message', '@message'],
  pod: 'kubernetes.pod.name',
  tiebreaker: '_doc',
  timestamp: '@timestamp',
};

const DEFAULT_SOURCE = {
  metricAlias: 'xpack-infra-default-metrics',
  logAlias: 'xpack-infra-default-logs',
  fields: DEFAULT_FIELDS,
};
