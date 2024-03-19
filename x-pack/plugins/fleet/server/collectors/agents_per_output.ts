/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import _ from 'lodash';

import { outputTypeSupportPresets } from '../../common/services/output_helpers';
import type { AgentPolicy } from '../../common/types';

import { SO_SEARCH_LIMIT } from '../../common';
import { agentPolicyService, outputService } from '../services';

export interface AgentsPerOutputType {
  output_type: string;
  count_as_data: number;
  count_as_monitoring: number;
  preset_counts?: {
    balanced: number;
    custom: number;
    latency: number;
    scale: number;
    throughput: number;
  };
}

export async function getAgentsPerOutput(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
): Promise<AgentsPerOutputType[]> {
  const { items: outputs } = await outputService.list(soClient);

  const defaultOutputId = outputs.find((output) => output.is_default)?.id || '';
  const defaultMonitoringOutputId =
    outputs.find((output) => output.is_default_monitoring)?.id || '';

  const outputsById = _.keyBy(outputs, 'id');
  const getDataOutputForAgentPolicy = (agentPolicy: AgentPolicy) =>
    outputsById[agentPolicy.data_output_id || defaultOutputId];
  const getMonitoringOutputForAgentPolicy = (agentPolicy: AgentPolicy) =>
    outputsById[agentPolicy.monitoring_output_id || defaultMonitoringOutputId];

  const { items: agentPolicies } = await agentPolicyService.list(soClient, {
    esClient,
    withAgentCount: true,
    page: 1,
    perPage: SO_SEARCH_LIMIT,
  });

  const outputTypes: { [key: string]: AgentsPerOutputType } = {};

  agentPolicies
    .filter((agentPolicy) => (agentPolicy.agents ?? 0) > 0)
    .forEach((agentPolicy) => {
      const dataOutput = getDataOutputForAgentPolicy(agentPolicy);
      const monitoringOutput = getMonitoringOutputForAgentPolicy(agentPolicy);

      if (!outputTypes[dataOutput.type]) {
        outputTypes[dataOutput.type] = {
          output_type: dataOutput.type,
          count_as_data: 0,
          count_as_monitoring: 0,
        };
      }

      outputTypes[dataOutput.type].count_as_data += agentPolicy.agents ?? 0;

      if (!outputTypes[monitoringOutput.type]) {
        outputTypes[monitoringOutput.type] = {
          output_type: monitoringOutput.type,
          count_as_data: 0,
          count_as_monitoring: 0,
        };
      }
      outputTypes[monitoringOutput.type].count_as_monitoring += agentPolicy.agents ?? 0;
    });

  outputs.forEach((output) => {
    if (!outputTypeSupportPresets(output.type)) {
      return;
    }
    if (!outputTypes[output.type]) {
      return;
    }
    const outputTelemetryRecord = outputTypes[output.type];

    if (!outputTelemetryRecord.preset_counts) {
      outputTelemetryRecord.preset_counts = {
        balanced: 0,
        custom: 0,
        latency: 0,
        scale: 0,
        throughput: 0,
      };
    }

    if (output.preset && output.preset in outputTelemetryRecord.preset_counts) {
      outputTelemetryRecord.preset_counts[
        output.preset as keyof typeof outputTelemetryRecord.preset_counts
      ] += 1;
    }
  });

  return Object.values(outputTypes);
}
