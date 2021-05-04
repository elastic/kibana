/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMPlugin, APMRouteHandlerResources } from '../..';
import { listConfigurations } from '../settings/agent_configuration/list_configurations';
import { setupRequest } from '../helpers/setup_request';
import { APMPluginStartDependencies } from '../../types';
import { ExternalCallback } from 'x-pack/plugins/fleet/server';

export async function registerFleetPolicyCallbacks({
  plugins,
  apmRuleRegistry,
  config,
  logger,
}: {
  plugins: APMRouteHandlerResources['plugins'];
  apmRuleRegistry: APMRouteHandlerResources['apmRuleRegistry'];
  config: NonNullable<APMPlugin['currentConfig']>;
  logger: NonNullable<APMPlugin['logger']>;
}) {
  if (!plugins.fleet) {
    return;
  }
  const fleetPluginStart = await plugins.fleet.start();

  registerAgentConfigExternalCallback({
    fleetPluginStart,
    callbackName: 'packagePolicyCreate',
    plugins,
    apmRuleRegistry,
    config,
    logger,
  });
  registerAgentConfigExternalCallback({
    fleetPluginStart,
    callbackName: 'packagePolicyUpdate',
    plugins,
    apmRuleRegistry,
    config,
    logger,
  });
}

type ExternalCallbackParams = Parameters<ExternalCallback[1]>;
type PackagePolicy = ExternalCallbackParams[0];
type Context = ExternalCallbackParams[1];
type Request = ExternalCallbackParams[2];

function registerAgentConfigExternalCallback({
  fleetPluginStart,
  callbackName,
  plugins,
  apmRuleRegistry,
  config,
  logger,
}: {
  fleetPluginStart: NonNullable<APMPluginStartDependencies['fleet']>;
  callbackName: ExternalCallback[0];
  plugins: APMRouteHandlerResources['plugins'];
  apmRuleRegistry: APMRouteHandlerResources['apmRuleRegistry'];
  config: NonNullable<APMPlugin['currentConfig']>;
  logger: NonNullable<APMPlugin['logger']>;
}) {
  const callbackFn: ExternalCallback[1] = async (
    packagePolicy: PackagePolicy,
    context: Context,
    request: Request
  ) => {
    if (packagePolicy.package?.name !== 'apm') {
      return packagePolicy;
    }
    const setup = await setupRequest({
      context: context as any,
      params: { query: { _inspect: false } },
      core: null as any,
      plugins,
      request,
      config,
      logger,
      apmRuleRegistry,
    });
    const configurations = await listConfigurations({ setup });
    const agentConfigValue = configurations.map((config) => ({
      service: config.service,
      settings: config.settings,
    }));
    packagePolicy.inputs[0].config = {
      agent_config: {
        value: agentConfigValue,
      },
    };
    return packagePolicy;
  };

  fleetPluginStart.registerExternalCallback(callbackName, callbackFn);
}
