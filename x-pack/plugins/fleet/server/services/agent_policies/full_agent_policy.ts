/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from 'kibana/server';
import { safeLoad } from 'js-yaml';

import type {
  FullAgentPolicy,
  PackagePolicy,
  Settings,
  Output,
  FullAgentPolicyOutput,
} from '../../types';
import { agentPolicyService } from '../agent_policy';
import { outputService } from '../output';
import {
  storedPackagePoliciesToAgentPermissions,
  DEFAULT_PERMISSIONS,
} from '../package_policies_to_agent_permissions';
import { storedPackagePoliciesToAgentInputs, dataTypes } from '../../../common';
import type { FullAgentPolicyOutputPermissions } from '../../../common';
import { getSettings } from '../settings';

const MONITORING_DATASETS = [
  'elastic_agent',
  'elastic_agent.elastic_agent',
  'elastic_agent.apm_server',
  'elastic_agent.filebeat',
  'elastic_agent.fleet_server',
  'elastic_agent.metricbeat',
  'elastic_agent.osquerybeat',
  'elastic_agent.packetbeat',
  'elastic_agent.endpoint_security',
  'elastic_agent.auditbeat',
  'elastic_agent.heartbeat',
];

export async function getFullAgentPolicy(
  soClient: SavedObjectsClientContract,
  id: string,
  options?: { standalone: boolean }
): Promise<FullAgentPolicy | null> {
  let agentPolicy;
  const standalone = options?.standalone;

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

  const defaultOutputId = await outputService.getDefaultOutputId(soClient);
  if (!defaultOutputId) {
    throw new Error('Default output is not setup');
  }

  const dataOutputId = agentPolicy.data_output_id || defaultOutputId;
  const monitoringOutputId = agentPolicy.monitoring_output_id || defaultOutputId;

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

  const fullAgentPolicy: FullAgentPolicy = {
    id: agentPolicy.id,
    outputs: {
      ...outputs.reduce<FullAgentPolicy['outputs']>((acc, output) => {
        acc[getOutputIdForAgentPolicy(output)] = transformOutputToFullPolicyOutput(output);

        return acc;
      }, {}),
    },
    inputs: storedPackagePoliciesToAgentInputs(
      agentPolicy.package_policies as PackagePolicy[],
      getOutputIdForAgentPolicy(dataOutput)
    ),
    revision: agentPolicy.revision,
    ...(agentPolicy.monitoring_enabled && agentPolicy.monitoring_enabled.length > 0
      ? {
          agent: {
            monitoring: {
              namespace: agentPolicy.namespace,
              use_output: getOutputIdForAgentPolicy(monitoringOutput),
              enabled: true,
              logs: agentPolicy.monitoring_enabled.includes(dataTypes.Logs),
              metrics: agentPolicy.monitoring_enabled.includes(dataTypes.Metrics),
            },
          },
        }
      : {
          agent: {
            monitoring: { enabled: false, logs: false, metrics: false },
          },
        }),
  };

  const dataPermissions = (await storedPackagePoliciesToAgentPermissions(
    soClient,
    agentPolicy.package_policies
  )) || { _fallback: DEFAULT_PERMISSIONS };

  dataPermissions._elastic_agent_checks = {
    cluster: DEFAULT_PERMISSIONS.cluster,
  };

  // TODO: fetch this from the elastic agent package
  const monitoringNamespace = fullAgentPolicy.agent?.monitoring.namespace;
  const monitoringPermissions: FullAgentPolicyOutputPermissions =
    monitoringOutputId === dataOutputId
      ? dataPermissions
      : {
          _elastic_agent_checks: {
            cluster: DEFAULT_PERMISSIONS.cluster,
          },
        };
  if (
    fullAgentPolicy.agent?.monitoring.enabled &&
    monitoringNamespace &&
    monitoringOutput &&
    monitoringOutput.type === 'elasticsearch'
  ) {
    let names: string[] = [];
    if (fullAgentPolicy.agent.monitoring.logs) {
      names = names.concat(
        MONITORING_DATASETS.map((dataset) => `logs-${dataset}-${monitoringNamespace}`)
      );
    }
    if (fullAgentPolicy.agent.monitoring.metrics) {
      names = names.concat(
        MONITORING_DATASETS.map((dataset) => `metrics-${dataset}-${monitoringNamespace}`)
      );
    }

    monitoringPermissions._elastic_agent_checks.indices = [
      {
        names,
        privileges: ['auto_configure', 'create_doc'],
      },
    ];
  }

  // Only add permissions if output.type is "elasticsearch"
  fullAgentPolicy.output_permissions = Object.keys(fullAgentPolicy.outputs).reduce<
    NonNullable<FullAgentPolicy['output_permissions']>
  >((outputPermissions, outputId) => {
    const output = fullAgentPolicy.outputs[outputId];
    if (output && output.type === 'elasticsearch') {
      outputPermissions[outputId] =
        outputId === getOutputIdForAgentPolicy(dataOutput)
          ? dataPermissions
          : monitoringPermissions;
    }
    return outputPermissions;
  }, {});

  // only add settings if not in standalone
  if (!standalone) {
    let settings: Settings;
    try {
      settings = await getSettings(soClient);
    } catch (error) {
      throw new Error('Default settings is not setup');
    }
    if (settings.fleet_server_hosts && settings.fleet_server_hosts.length) {
      fullAgentPolicy.fleet = {
        hosts: settings.fleet_server_hosts,
      };
    }
  }
  return fullAgentPolicy;
}

function transformOutputToFullPolicyOutput(
  output: Output,
  standalone = false
): FullAgentPolicyOutput {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { config_yaml, type, hosts, ca_sha256, api_key } = output;
  const configJs = config_yaml ? safeLoad(config_yaml) : {};
  const newOutput: FullAgentPolicyOutput = {
    type,
    hosts,
    ca_sha256,
    api_key,
    ...configJs,
  };

  if (standalone) {
    delete newOutput.api_key;
    newOutput.username = 'ES_USERNAME';
    newOutput.password = 'ES_PASSWORD';
  }

  return newOutput;
}

/**
 * Get id used in full agent policy (sent to the agents)
 * we use "default" for the default policy to avoid breaking changes
 */
function getOutputIdForAgentPolicy(output: Output) {
  if (output.is_default) {
    return 'default';
  }

  return output.id;
}
