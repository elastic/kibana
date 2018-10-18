/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

import { InfraConfigurationAdapter } from './adapter_types';

export class InfraKibanaConfigurationAdapter<Configuration>
  implements InfraConfigurationAdapter<Configuration> {
  private readonly server: ServerWithConfig;

  constructor(server: any) {
    if (!isServerWithConfig(server)) {
      throw new Error('Failed to find configuration on server.');
    }

    this.server = server;
  }

  public async get() {
    const config = this.server.config();

    if (!isKibanaConfiguration(config)) {
      throw new Error('Failed to access configuration of server.');
    }

    const configuration = config.get('xpack.infra') || {};
    const configurationWithDefaults = {
      enabled: true,
      query: {
        partitionSize: 75,
        partitionFactor: 1.2,
        ...(configuration.query || {}),
      },
      sources: {},
      ...configuration,
    } as Configuration;

    // we assume this to be the configuration because Kibana would have already validated it
    return configurationWithDefaults;
  }
}

interface ServerWithConfig {
  config(): any;
}

function isServerWithConfig(maybeServer: any): maybeServer is ServerWithConfig {
  return (
    Joi.validate(
      maybeServer,
      Joi.object({
        config: Joi.func().required(),
      }).unknown()
    ).error === null
  );
}

interface KibanaConfiguration {
  get(key: string): any;
}

function isKibanaConfiguration(maybeConfiguration: any): maybeConfiguration is KibanaConfiguration {
  return (
    Joi.validate(
      maybeConfiguration,
      Joi.object({
        get: Joi.func().required(),
      }).unknown()
    ).error === null
  );
}
