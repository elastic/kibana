/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreStart,
  CoreSetup,
  Plugin,
  PluginInitializerContext,
  Logger,
} from '@kbn/core/server';
import type {
  WCISalesforcePluginStart,
  WCISalesforcePluginSetup,
  WCISalesforcePluginSetupDependencies,
  WCISalesforcePluginStartDependencies,
} from './types';
import { getSalesforceIntegrationDefinition } from './integration';

export class WCISalesforcePlugin
  implements
    Plugin<
      WCISalesforcePluginSetup,
      WCISalesforcePluginStart,
      WCISalesforcePluginSetupDependencies,
      WCISalesforcePluginStartDependencies
    >
{
  private readonly logger: Logger;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  public setup(
    core: CoreSetup,
    { workchatApp }: WCISalesforcePluginSetupDependencies
  ): WCISalesforcePluginSetup {
    workchatApp.integrations.register(
      getSalesforceIntegrationDefinition({
        core,
        logger: this.logger,
      })
    );

    return {};
  }

  public start(
    core: CoreStart,
    pluginsDependencies: WCISalesforcePluginStartDependencies
  ): WCISalesforcePluginStart {
    return {};
  }
}
