/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type CoreSetup, type Plugin, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import type {
  WCISalesforcePluginSetup,
  WCISalesforcePluginStart,
  WCISalesforcePluginSetupDependencies,
  WCISalesforcePluginStartDependencies,
} from './types';
import { getSalesforceIntegrationComponents } from './integration/salesforce_integration';

export class WCISalesforcePlugin
  implements
    Plugin<
      WCISalesforcePluginSetup,
      WCISalesforcePluginStart,
      WCISalesforcePluginSetupDependencies,
      WCISalesforcePluginStartDependencies
    >
{
  constructor(context: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<WCISalesforcePluginStartDependencies, WCISalesforcePluginStart>,
    { workchatApp }: WCISalesforcePluginSetupDependencies
  ): WCISalesforcePluginSetup {
    workchatApp.integrations.register(getSalesforceIntegrationComponents());
    return {};
  }

  public start(
    coreStart: CoreStart,
    pluginsStart: WCISalesforcePluginStartDependencies
  ): WCISalesforcePluginStart {
    return {};
  }

  public stop() {}
}
