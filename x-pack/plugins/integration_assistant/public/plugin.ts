/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Plugin, CoreSetup } from '@kbn/core/public';
import type {
  IntegrationAssistantPluginSetup,
  IntegrationAssistantPluginStart,
  IntegrationAssistantPluginStartDependencies,
} from './types';
import { getCreateIntegrationLazy } from './components/create_integration';
import { getCreateIntegrationCardButtonLazy } from './components/create_integration_card_button';
import { Telemetry, type Services } from './services';

export class IntegrationAssistantPlugin
  implements Plugin<IntegrationAssistantPluginSetup, IntegrationAssistantPluginStart>
{
  private telemetry = new Telemetry();

  public setup(core: CoreSetup): IntegrationAssistantPluginSetup {
    this.telemetry.setup(core.analytics);
    return {};
  }

  public start(
    core: CoreStart,
    dependencies: IntegrationAssistantPluginStartDependencies
  ): IntegrationAssistantPluginStart {
    const services: Services = {
      ...core,
      ...dependencies,
      telemetry: this.telemetry.start(),
    };

    return {
      CreateIntegration: getCreateIntegrationLazy(services),
      CreateIntegrationCardButton: getCreateIntegrationCardButtonLazy(),
    };
  }

  public stop() {}
}
