/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';
import { CloudCollaborationConfigType } from './config';
import { registerTokenRoute } from './routes';

import {
  CloudCollaborationPluginSetup,
  CloudCollaborationPluginStart,
  CloudCollaborationPluginSetupDependencies,
  CloudCollaborationPluginStartDependencies,
} from './types';

export class CloudCollaborationPlugin
  implements
    Plugin<
      CloudCollaborationPluginSetup,
      CloudCollaborationPluginStart,
      CloudCollaborationPluginSetupDependencies,
      CloudCollaborationPluginStartDependencies
    >
{
  private readonly config: CloudCollaborationConfigType;
  private readonly logger: Logger;
  private readonly isDev: boolean;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.isDev = initializerContext.env.mode.dev;
    this.config = initializerContext.config.get();
  }

  public setup(core: CoreSetup, { cloud, security }: CloudCollaborationPluginSetupDependencies) {
    const { cloudId } = cloud;
    const { secret, appId } = this.config;
    registerTokenRoute({
      router: core.http.createRouter(),
      security,
      cloudId,
      secret,
      appId,
      isDev: this.isDev,
    });
    return {};
  }

  public start(_core: CoreStart) {
    this.logger.debug('cloudCollaboration: Started');
    return {};
  }

  public stop() {}
}
