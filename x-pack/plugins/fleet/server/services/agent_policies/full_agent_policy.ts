/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { safeLoad } from 'js-yaml';

import type {
  FullAgentPolicy,
  PackagePolicy,
  Output,
  ShipperOutput,
  FullAgentPolicyOutput,
  FleetProxy,
  FleetServerHost,
} from '../../types';
import type { FullAgentPolicyOutputPermissions, PackageInfo } from '../../../common/types';
import { agentPolicyService } from '../agent_policy';
import { dataTypes, outputType } from '../../../common/constants';
import { DEFAULT_OUTPUT } from '../../constants';

import { getPackageInfo } from '../epm/packages';
import { pkgToPkgKey, splitPkgKey } from '../epm/registry';
import { appContextService } from '../app_context';

import { getMonitoringPermissions } from './monitoring_permissions';
import { storedPackagePoliciesToAgentInputs } from '.';
import {
  storedPackagePoliciesToAgentPermissions,
  DEFAULT_CLUSTER_PERMISSIONS,
} from './package_policies_to_agent_permissions';
import { fetchRelatedSavedObjects } from './related_saved_objects';

async function fetchAgentPolicy(soClient: SavedObjectsClientContract, id: string) {
  try {
    return await agentPolicyService.get(soClient, id);
  } catch (err) {
    if (!err.isBoom || err.output.statusCode !== 404) {
      throw err;
    }
  }
  return null;
}

export async function getFullAgentPolicy(
  soClient: SavedObjectsClientContract,
  id: string,
  options?: { standalone: boolean }
): Promise<FullAgentPolicy | null> {
  const standalone = options?.standalone ?? false;

  const agentPolicy = await fetchAgentPolicy(soClient, id);
  if (!agentPolicy) {
    return null;
  }

  const { outputs, proxies, dataOutput, fleetServerHosts, monitoringOutput, sourceUri } =
    await fetchRelatedSavedObjects(soClient, agentPolicy);

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
          output.proxy_id ? proxies.find((proxy) => output.proxy_id === proxy.id) : undefined,
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
        sourceURI: sourceUri,
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
      features: (agentPolicy.agent_features || []).reduce((acc, { name, ...featureConfig }) => {
        acc[name] = featureConfig;
        return acc;
      }, {} as NonNullable<FullAgentPolicy['agent']>['features']),
      protection: {
        enabled: false,
        uninstall_token_hash: '',
        signing_key: '',
      },
    },
    signed: {
      data: '',
      signature: '',
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
  if (!standalone && fleetServerHosts) {
    fullAgentPolicy.fleet = generateFleetConfig(fleetServerHosts, proxies);
  }

  // populate protection and signed properties
  const messageSigningService = appContextService.getMessageSigningService();
  if (messageSigningService && fullAgentPolicy.agent) {
    const publicKey = await messageSigningService.getPublicKey();

    fullAgentPolicy.agent.protection = {
      enabled: false,
      uninstall_token_hash: '',
      signing_key: publicKey,
    };

    const dataToSign = {
      id: fullAgentPolicy.id,
      agent: {
        protection: fullAgentPolicy.agent.protection,
      },
    };

    const { data: signedData, signature } = await messageSigningService.sign(dataToSign);
    fullAgentPolicy.signed = {
      data: signedData.toString('base64'),
      signature,
    };
  }

  return fullAgentPolicy;
}

export function generateFleetConfig(
  fleetServerHosts: FleetServerHost,
  proxies: FleetProxy[]
): FullAgentPolicy['fleet'] {
  const config: FullAgentPolicy['fleet'] = {
    hosts: fleetServerHosts.host_urls,
  };
  const fleetServerHostproxy = fleetServerHosts.proxy_id
    ? proxies.find((proxy) => proxy.id === fleetServerHosts.proxy_id)
    : null;
  if (fleetServerHostproxy) {
    config.proxy_url = fleetServerHostproxy.url;
    if (fleetServerHostproxy.proxy_headers) {
      config.proxy_headers = fleetServerHostproxy.proxy_headers;
    }
    if (
      fleetServerHostproxy.certificate_authorities ||
      fleetServerHostproxy.certificate ||
      fleetServerHostproxy.certificate_key
    ) {
      config.ssl = {
        renegotiation: 'never',
        verification_mode: '',
        ...(fleetServerHostproxy.certificate_authorities && {
          certificate_authorities: [fleetServerHostproxy.certificate_authorities],
        }),
        ...(fleetServerHostproxy.certificate && { certificate: fleetServerHostproxy.certificate }),
        ...(fleetServerHostproxy.certificate_key && { key: fleetServerHostproxy.certificate_key }),
      };
    }
  }
  return config;
}

export function transformOutputToFullPolicyOutput(
  output: Output,
  proxy?: FleetProxy,
  standalone = false
): FullAgentPolicyOutput {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { config_yaml, type, hosts, ca_sha256, ca_trusted_fingerprint, ssl, shipper } = output;

  const configJs = config_yaml ? safeLoad(config_yaml) : {};

  // build logic to read config_yaml and transform it with the new shipper data
  const isShipperDisabled = !configJs?.shipper || configJs?.shipper?.enabled === false;
  let shipperDiskQueueData = {};
  let generalShipperData;

  if (shipper) {
    if (!isShipperDisabled) {
      shipperDiskQueueData = buildShipperQueueData(shipper);
    }
    /* eslint-disable @typescript-eslint/naming-convention */
    const {
      loadbalance,
      compression_level,
      queue_flush_timeout,
      max_batch_bytes,
      mem_queue_events,
    } = shipper;
    /* eslint-enable @typescript-eslint/naming-convention */

    generalShipperData = {
      loadbalance,
      compression_level,
      queue_flush_timeout,
      max_batch_bytes,
      mem_queue_events,
    };
  }

  const newOutput: FullAgentPolicyOutput = {
    ...configJs,
    ...shipperDiskQueueData,
    type,
    hosts,
    ...(!isShipperDisabled ? generalShipperData : {}),
    ...(ca_sha256 ? { ca_sha256 } : {}),
    ...(ssl ? { ssl } : {}),
    ...(ca_trusted_fingerprint ? { 'ssl.ca_trusted_fingerprint': ca_trusted_fingerprint } : {}),
  };

  if (proxy) {
    newOutput.proxy_url = proxy.url;
    if (proxy.proxy_headers) {
      newOutput.proxy_headers = proxy.proxy_headers;
    }

    if (proxy.certificate_authorities) {
      if (!newOutput.ssl) {
        newOutput.ssl = {};
      }
      if (!newOutput.ssl.certificate_authorities) {
        newOutput.ssl.certificate_authorities = [];
      }
      newOutput.ssl.certificate_authorities.push(proxy.certificate_authorities);
    }
    if (proxy.certificate) {
      if (!newOutput.ssl) {
        newOutput.ssl = {};
      }
      newOutput.ssl.certificate = proxy.certificate;
    }
    if (proxy.certificate_key) {
      if (!newOutput.ssl) {
        newOutput.ssl = {};
      }
      newOutput.ssl.key = proxy.certificate_key;
    }
  }

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

/* eslint-disable @typescript-eslint/naming-convention */
function buildShipperQueueData(shipper: ShipperOutput) {
  const {
    disk_queue_enabled,
    disk_queue_path,
    disk_queue_max_size,
    disk_queue_compression_enabled,
  } = shipper;
  if (!disk_queue_enabled) return {};

  return {
    shipper: {
      queue: {
        disk: {
          path: disk_queue_path,
          max_size: disk_queue_max_size,
          use_compression: disk_queue_compression_enabled,
        },
      },
    },
  };
}
/* eslint-enable @typescript-eslint/naming-convention */
