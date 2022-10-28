/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { safeLoad } from 'js-yaml';

import type { FullAgentPolicy, PackagePolicy, Output, FullAgentPolicyOutput } from '../../types';
import { agentPolicyService } from '../agent_policy';
import { outputService } from '../output';
import { dataTypes, outputType } from '../../../common/constants';
import type { FullAgentPolicyOutputPermissions, PackageInfo } from '../../../common/types';
import { DEFAULT_OUTPUT } from '../../constants';

import { getSourceUriForAgentPolicy } from '../../routes/agent/source_uri_utils';

import { getPackageInfo } from '../epm/packages';
import { pkgToPkgKey, splitPkgKey } from '../epm/registry';
import { getFleetServerHostsForAgentPolicy } from '../fleet_server_host';
import { appContextService } from '../app_context';

import { getMonitoringPermissions } from './monitoring_permissions';
import { storedPackagePoliciesToAgentInputs } from '.';
import {
  storedPackagePoliciesToAgentPermissions,
  DEFAULT_CLUSTER_PERMISSIONS,
} from './package_policies_to_agent_permissions';

export async function getFullAgentPolicy(
  soClient: SavedObjectsClientContract,
  id: string,
  options?: { standalone: boolean }
): Promise<FullAgentPolicy | null> {
  let agentPolicy;
  const standalone = options?.standalone ?? false;

  try {
    agentPolicy = await agentPolicyService.get(soClient, id);
  } catch (err) {
    if (!err.isBoom || err.output.statusCode !== 404) {
      throw err;
    }
  }

  if (!agentPolicy) {
    return null;
  }

  const defaultDataOutputId = await outputService.getDefaultDataOutputId(soClient);

  if (!defaultDataOutputId) {
    throw new Error('Default output is not setup');
  }

  const dataOutputId: string = agentPolicy.data_output_id || defaultDataOutputId;
  const monitoringOutputId: string =
    agentPolicy.monitoring_output_id ||
    (await outputService.getDefaultMonitoringOutputId(soClient)) ||
    dataOutputId;

  const outputs = await Promise.all(
    Array.from(new Set([dataOutputId, monitoringOutputId])).map((outputId) =>
      outputService.get(soClient, outputId)
    )
  );

  const dataOutput = outputs.find((output) => output.id === dataOutputId);
  if (!dataOutput) {
    throw new Error(`Data output not found ${dataOutputId}`);
  }
  const monitoringOutput = outputs.find((output) => output.id === monitoringOutputId);
  if (!monitoringOutput) {
    throw new Error(`Monitoring output not found ${monitoringOutputId}`);
  }

  const sourceUri = await getSourceUriForAgentPolicy(soClient, agentPolicy);

  // Build up an in-memory object for looking up Package Info, so we don't have
  // call `getPackageInfo` for every single policy, which incurs performance costs
  const packageInfoCache = new Map<string, PackageInfo>();
  for (const policy of agentPolicy.package_policies as PackagePolicy[]) {
    if (!policy.package || packageInfoCache.has(pkgToPkgKey(policy.package))) {
      continue;
    }

    // Prime the cache w/ just the package key - we'll fetch all the package
    // info concurrently below
    packageInfoCache.set(pkgToPkgKey(policy.package), {} as PackageInfo);
  }

  // Fetch all package info concurrently
  await Promise.all(
    Array.from(packageInfoCache.keys()).map(async (pkgKey) => {
      const { pkgName, pkgVersion } = splitPkgKey(pkgKey);

      const packageInfo = await getPackageInfo({
        savedObjectsClient: soClient,
        pkgName,
        pkgVersion,
      });

      packageInfoCache.set(pkgKey, packageInfo);
    })
  );

  const fullAgentPolicy: FullAgentPolicy = {
    id: agentPolicy.id,
    outputs: {
      ...outputs.reduce<FullAgentPolicy['outputs']>((acc, output) => {
        acc[getOutputIdForAgentPolicy(output)] = transformOutputToFullPolicyOutput(
          output,
          standalone
        );

        return acc;
      }, {}),
    },
    inputs: await storedPackagePoliciesToAgentInputs(
      agentPolicy.package_policies as PackagePolicy[],
      packageInfoCache,
      getOutputIdForAgentPolicy(dataOutput)
    ),
    revision: agentPolicy.revision,
    agent: {
      download: {
        source_uri: sourceUri,
      },
      monitoring:
        agentPolicy.monitoring_enabled && agentPolicy.monitoring_enabled.length > 0
          ? {
              namespace: agentPolicy.namespace,
              use_output: getOutputIdForAgentPolicy(monitoringOutput),
              enabled: true,
              logs: agentPolicy.monitoring_enabled.includes(dataTypes.Logs),
              metrics: agentPolicy.monitoring_enabled.includes(dataTypes.Metrics),
            }
          : { enabled: false, logs: false, metrics: false },
    },
  };

  const dataPermissions =
    (await storedPackagePoliciesToAgentPermissions(
      packageInfoCache,
      agentPolicy.package_policies
    )) || {};

  dataPermissions._elastic_agent_checks = {
    cluster: DEFAULT_CLUSTER_PERMISSIONS,
  };

  const monitoringPermissions = await getMonitoringPermissions(
    soClient,
    {
      logs: agentPolicy.monitoring_enabled?.includes(dataTypes.Logs) ?? false,
      metrics: agentPolicy.monitoring_enabled?.includes(dataTypes.Metrics) ?? false,
    },
    agentPolicy.namespace
  );
  monitoringPermissions._elastic_agent_checks = {
    cluster: DEFAULT_CLUSTER_PERMISSIONS,
  };

  // Only add permissions if output.type is "elasticsearch"
  fullAgentPolicy.output_permissions = Object.keys(fullAgentPolicy.outputs).reduce<
    NonNullable<FullAgentPolicy['output_permissions']>
  >((outputPermissions, outputId) => {
    const output = fullAgentPolicy.outputs[outputId];
    if (output && output.type === outputType.Elasticsearch) {
      const permissions: FullAgentPolicyOutputPermissions = {};
      if (outputId === getOutputIdForAgentPolicy(monitoringOutput)) {
        Object.assign(permissions, monitoringPermissions);
      }

      if (outputId === getOutputIdForAgentPolicy(dataOutput)) {
        Object.assign(permissions, dataPermissions);
      }

      outputPermissions[outputId] = permissions;
    }
    return outputPermissions;
  }, {});

  // only add fleet server hosts if not in standalone
  if (!standalone) {
    const fleetServerHost = await getFleetServerHostsForAgentPolicy(soClient, agentPolicy).catch(
      (err) => {
        appContextService.getLogger()?.error(err);

        return;
      }
    );

    if (fleetServerHost) {
      fullAgentPolicy.fleet = {
        hosts: fleetServerHost.host_urls,
      };
    }
  }
  return fullAgentPolicy;
}

export function transformOutputToFullPolicyOutput(
  output: Output,
  standalone = false
): FullAgentPolicyOutput {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { config_yaml, type, hosts, ca_sha256, ca_trusted_fingerprint, ssl } = output;
  const configJs = config_yaml ? safeLoad(config_yaml) : {};
  const newOutput: FullAgentPolicyOutput = {
    ...configJs,
    type,
    hosts,
    ...(ca_sha256 ? { ca_sha256 } : {}),
    ...(ssl ? { ssl } : {}),
    ...(ca_trusted_fingerprint ? { 'ssl.ca_trusted_fingerprint': ca_trusted_fingerprint } : {}),
  };

  if (output.type === outputType.Elasticsearch && standalone) {
    newOutput.username = '${ES_USERNAME}';
    newOutput.password = '${ES_PASSWORD}';
  }

  return newOutput;
}

/**
 * Get id used in full agent policy (sent to the agents)
 * we use "default" for the default policy to avoid breaking changes
 */
function getOutputIdForAgentPolicy(output: Output) {
  if (output.is_default) {
    return DEFAULT_OUTPUT.name;
  }

  return output.id;
}
