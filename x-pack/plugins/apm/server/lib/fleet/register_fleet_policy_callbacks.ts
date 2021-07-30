/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMPlugin, APMRouteHandlerResources } from '../..';
import { ExternalCallback } from '../../../../fleet/server';
import type { DeletePackagePoliciesResponse } from '../../../../fleet/common';
import { AgentConfiguration } from '../../../common/agent_configuration/configuration_types';
import { AGENT_NAME } from '../../../common/elasticsearch_fieldnames';
import { APMPluginStartDependencies } from '../../types';
import { setupRequest } from '../helpers/setup_request';
import { mergePackagePolicyWithApm } from './merge_package_policy_with_apm';

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
  registerPackagePolicyExternalCallback({
    fleetPluginStart,
    callbackName: 'packagePolicyCreate',
    plugins,
    ruleDataClient,
    config,
    logger,
  });

  // Registers a callback invoked when a policy is updated to populate the APM
  // integration policy with existing agent configurations
  registerPackagePolicyExternalCallback({
    fleetPluginStart,
    callbackName: 'packagePolicyUpdate',
    plugins,
    ruleDataClient,
    config,
    logger,
  });

  // Registers a callback invoked when a policy is removed to unlink it from TA
  registerPackagePolicyExternalCallback({
    fleetPluginStart,
    callbackName: 'postPackagePolicyDelete',
    plugins,
    ruleDataClient,
    config,
    logger,
  });
}

type ExternalCallbackParams = Parameters<ExternalCallback[1]>;
export type PackagePolicy = ExternalCallbackParams[0];
type Context = ExternalCallbackParams[1];
type Request = ExternalCallbackParams[2];

function registerPackagePolicyExternalCallback({
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
    if (packagePolicy instanceof Array) {
      return undefined;
    }
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
    return await mergePackagePolicyWithApm({
      setup,
      fleetPluginStart,
      packagePolicy,
    });
  };

  fleetPluginStart.registerExternalCallback(callbackName, callbackFn);
}

export const APM_SERVER = 'apm-server';

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
