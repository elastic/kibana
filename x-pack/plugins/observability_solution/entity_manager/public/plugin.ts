/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import { Logger } from '@kbn/logging';

import { EntityManagerPluginClass } from './types';
import type { EntityManagerPublicConfig } from '../common/config';
import { EntityClient } from './lib/entity_client';

export class Plugin implements EntityManagerPluginClass {
  public config: EntityManagerPublicConfig;
  public logger: Logger;

  constructor(context: PluginInitializerContext<{}>) {
    this.config = context.config.get();
    this.logger = context.logger.get();
  }

  setup(core: CoreSetup) {
    const entityClient = new EntityClient(core.http);
    return {
      entityClient,
    };
  }

  start(core: CoreStart) {
    const entityClient = new EntityClient(core.http);
    return {
      entityClient,
    };
  }

  stop() {}
}
