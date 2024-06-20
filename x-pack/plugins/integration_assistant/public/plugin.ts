/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Plugin, CoreSetup, ApplicationStart } from '@kbn/core/public';
import type {
  IntegrationAssistantPluginSetup,
  IntegrationAssistantPluginStart,
  IntegrationAssistantPluginStartDependencies,
} from './types';
import { getCreateIntegrationLazy } from './components/create_integration';
import { getCreateIntegrationCardButtonLazy } from './components/create_integration_card_button';
import { IntegrationAssistantUICapability } from '../common/feature';

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
    const isAuthorized = hasBasicCapabilities(core.application.capabilities);
    if (!isAuthorized) {
      return {};
    }
    return {
      CreateIntegration: getCreateIntegrationLazy(services),
      CreateIntegrationCardButton: getCreateIntegrationCardButtonLazy(),
    };
  }

  public stop() {}
}

const hasBasicCapabilities = (capabilities: ApplicationStart['capabilities']): boolean => {
  const { fleet: integrations, fleetv2: fleet, actions } = capabilities;
  if (
    !fleet?.all ||
    !integrations?.all ||
    !integrations?.[IntegrationAssistantUICapability] || // create integrations assistant capability from sub-feature
    !actions?.show ||
    !actions?.execute
  ) {
    return false;
  }
  return true;
};
