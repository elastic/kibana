/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PostPackagePolicyCreateCallback,
  PutPackagePolicyUpdateCallback,
} from '@kbn/fleet-plugin/server';
import {
  NewPackagePolicy,
  UpdatePackagePolicy,
} from '@kbn/fleet-plugin/common';
import { APMPlugin, APMRouteHandlerResources } from '../..';
import { createInternalESClient } from '../../lib/helpers/create_es_client/create_internal_es_client';
import { AgentConfiguration } from '../../../common/agent_configuration/configuration_types';
import { AGENT_NAME } from '../../../common/elasticsearch_fieldnames';
import { APMPluginStartDependencies } from '../../types';
import { mergePackagePolicyWithApm } from './merge_package_policy_with_apm';

export async function registerFleetPolicyCallbacks({
  plugins,
  ruleDataClient,
  config,
  logger,
  kibanaVersion,
}: {
  plugins: APMRouteHandlerResources['plugins'];
  ruleDataClient: APMRouteHandlerResources['ruleDataClient'];
  config: NonNullable<APMPlugin['currentConfig']>;
  logger: NonNullable<APMPlugin['logger']>;
  kibanaVersion: string;
}) {
  if (!plugins.fleet) {
    return;
  }
  const fleetPluginStart = await plugins.fleet.start();

  // Registers a callback invoked when a policy is created to populate the APM
  // integration policy with pre-existing agent configurations and source maps
  registerPackagePolicyExternalCallback({
    fleetPluginStart,
    callbackName: 'packagePolicyCreate',
    plugins,
    ruleDataClient,
    config,
    logger,
    kibanaVersion,
  });

  // Registers a callback invoked when a policy is updated to populate the APM
  // integration policy with existing agent configurations and source maps
  registerPackagePolicyExternalCallback({
    fleetPluginStart,
    callbackName: 'packagePolicyUpdate',
    plugins,
    ruleDataClient,
    config,
    logger,
    kibanaVersion,
  });
}

type ExternalCallbackParams =
  | Parameters<PostPackagePolicyCreateCallback>
  | Parameters<PutPackagePolicyUpdateCallback>;
export type PackagePolicy = NewPackagePolicy | UpdatePackagePolicy;
type Context = ExternalCallbackParams[1];
type Request = ExternalCallbackParams[2];

function registerPackagePolicyExternalCallback({
  fleetPluginStart,
  callbackName,
  plugins,
  ruleDataClient,
  config,
  logger,
  kibanaVersion,
}: {
  fleetPluginStart: NonNullable<APMPluginStartDependencies['fleet']>;
  callbackName: 'packagePolicyCreate' | 'packagePolicyUpdate';
  plugins: APMRouteHandlerResources['plugins'];
  ruleDataClient: APMRouteHandlerResources['ruleDataClient'];
  config: NonNullable<APMPlugin['currentConfig']>;
  logger: NonNullable<APMPlugin['logger']>;
  kibanaVersion: string;
}) {
  const callbackFn:
    | PostPackagePolicyCreateCallback
    | PutPackagePolicyUpdateCallback = async (
    packagePolicy: PackagePolicy,
    context: Context,
    request: Request
  ) => {
    if (packagePolicy.package?.name !== 'apm') {
      return packagePolicy;
    }

    const internalESClient = await createInternalESClient({
      context: context as any,
      debug: false,
      request,
      config,
    });

    return await mergePackagePolicyWithApm({
      internalESClient,
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
