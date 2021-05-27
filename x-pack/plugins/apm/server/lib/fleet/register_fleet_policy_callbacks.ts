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
import { ExternalCallback } from '../../../../fleet/server';
import { AGENT_NAME } from '../../../common/elasticsearch_fieldnames';
import { AgentConfiguration } from '../../../common/agent_configuration/configuration_types';

export async function registerFleetPolicyCallbacks({
  plugins,
  ruleDataClient,
  config,
  logger,
}: {
  plugins: APMRouteHandlerResources['plugins'];
  ruleDataClient: APMRouteHandlerResources['ruleDataClient'];
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
    ruleDataClient,
    config,
    logger,
  });
  registerAgentConfigExternalCallback({
    fleetPluginStart,
    callbackName: 'packagePolicyUpdate',
    plugins,
    ruleDataClient,
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
  ruleDataClient,
  config,
  logger,
}: {
  fleetPluginStart: NonNullable<APMPluginStartDependencies['fleet']>;
  callbackName: ExternalCallback[0];
  plugins: APMRouteHandlerResources['plugins'];
  ruleDataClient: APMRouteHandlerResources['ruleDataClient'];
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
      ruleDataClient,
    });
    const agentConfigurations = await listConfigurations({ setup });
    return getPackagePolicyWithAgentConfigurations(
      packagePolicy,
      agentConfigurations
    );
  };

  fleetPluginStart.registerExternalCallback(callbackName, callbackFn);
}

export function getPackagePolicyWithAgentConfigurations(
  packagePolicy: PackagePolicy,
  agentConfigurations: AgentConfiguration[]
) {
  const [firstInput, ...restInputs] = packagePolicy.inputs;
  return {
    ...packagePolicy,
    inputs: [
      {
        ...firstInput,
        config: {
          agent_config: {
            value: agentConfigurations.map((configuration) => ({
              service: configuration.service,
              config: configuration.settings,
              etag: configuration.etag,
              [AGENT_NAME]: configuration.agent_name,
            })),
          },
        },
      },
      ...restInputs,
    ],
  };
}
