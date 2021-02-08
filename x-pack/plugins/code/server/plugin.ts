/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext, Plugin } from 'src/core/server';
import { CodeConfigSchema } from './config';

/**
 * Represents Code Plugin instance that will be managed by the Kibana plugin system.
 */
export class CodePlugin implements Plugin {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public async setup() {
    const config = this.initializerContext.config.get<TypeOf<typeof CodeConfigSchema>>();

    if (config && Object.keys(config).length > 0) {
      this.initializerContext.logger
        .get('config', 'deprecation')
        .warn(
          'The experimental app "Code" has been removed from Kibana. Remove all xpack.code.* ' +
            'configurations from kibana.yml so Kibana does not fail to start up in the next major version.'
        );
    }
  }

  public start() {}

  public stop() {}
}
