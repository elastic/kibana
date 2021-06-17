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

  // Registers a callback invoked when a policy is created to populate the APM
  // integration policy with pre-existing agent configurations
  registerAgentConfigExternalCallback({
    fleetPluginStart,
    callbackName: 'packagePolicyCreate',
    plugins,
    ruleDataClient,
    config,
    logger,
  });

  // Registers a callback invoked when a policy is updated to populate the APM
  // integration policy with existing agent configurations
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

const APM_SERVER = 'apm-server';

// Immutable function applies the given package policy with a set of agent configurations
export function getPackagePolicyWithAgentConfigurations(
  packagePolicy: PackagePolicy,
  agentConfigurations: AgentConfiguration[]
) {
  const [firstInput, ...restInputs] = packagePolicy.inputs;
  const apmServerValue = firstInput?.config?.[APM_SERVER].value;
  return {
    ...packagePolicy,
    inputs: [
      {
        ...firstInput,
        config: {
          ...firstInput.config,
          [APM_SERVER]: {
            value: {
              ...apmServerValue,
              agent_config: agentConfigurations.map((configuration) => ({
                service: configuration.service,
                config: configuration.settings,
                etag: configuration.etag,
                [AGENT_NAME]: configuration.agent_name,
              })),
            },
          },
        },
      },
      ...restInputs,
    ],
  };
}
