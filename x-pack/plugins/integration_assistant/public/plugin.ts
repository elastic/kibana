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
import { Telemetry, type Services, type UpsellingPage } from './services';

export class IntegrationAssistantPlugin
  implements Plugin<IntegrationAssistantPluginSetup, IntegrationAssistantPluginStart>
{
  private telemetry = new Telemetry();
  private UpsellingPage?: UpsellingPage;

  public setup(core: CoreSetup): IntegrationAssistantPluginSetup {
    this.telemetry.setup(core.analytics);
    return {
      renderUpsellingComponent: (UpsellingPage) => {
        this.UpsellingPage = UpsellingPage;
      },
    };
  }

  public start(
    core: CoreStart,
    dependencies: IntegrationAssistantPluginStartDependencies
  ): IntegrationAssistantPluginStart {
    const services: Services = {
      ...core,
      ...dependencies,
      telemetry: this.telemetry.start(),
      UpsellingPage: this.UpsellingPage,
    };

    return {
      CreateIntegration: getCreateIntegrationLazy(services),
      CreateIntegrationCardButton: getCreateIntegrationCardButtonLazy(),
    };
  }

  public stop() {}
}
