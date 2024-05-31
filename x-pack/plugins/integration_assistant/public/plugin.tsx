/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, Plugin, CoreSetup } from '@kbn/core/public';
import {
  IntegrationAssistantPluginSetup,
  IntegrationAssistantPluginStart,
  IntegrationAssistantPluginStartDependencies,
} from './types';
import { getIntegrationAssistantLazy } from './components/integration_assistant';

export class IntegrationAssistantPlugin
  implements Plugin<IntegrationAssistantPluginSetup, IntegrationAssistantPluginStart>
{
  public setup(_: CoreSetup): IntegrationAssistantPluginSetup {
    return {};
  }

  public start(
    core: CoreStart,
    dependencies: IntegrationAssistantPluginStartDependencies
  ): IntegrationAssistantPluginStart {
    const services = { ...core, ...dependencies };
    return {
      IntegrationAssistant: () => getIntegrationAssistantLazy(services),
    };
  }

  public stop() {}
}
