/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import _ from 'lodash';

import { OUTPUT_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../../common';
import type { OutputSOAttributes } from '../types';
import { agentPolicyService } from '../services';

export interface AgentsPerOutputType {
  output_type: string;
  count_as_data: number;
  count_as_monitoring: number;
}

export async function getAgentsPerOutput(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
): Promise<AgentsPerOutputType[]> {
  const { saved_objects: outputs } = await soClient.find<OutputSOAttributes>({
    type: OUTPUT_SAVED_OBJECT_TYPE,
    page: 1,
    perPage: SO_SEARCH_LIMIT,
  });

  const defaultOutputId = outputs.find((output) => output.attributes.is_default)?.id || '';
  const defaultMonitoringOutputId =
    outputs.find((output) => output.attributes.is_default_monitoring)?.id || '';

  const outputsById = _.keyBy(outputs, 'id');
  const getOutputTypeById = (outputId: string): string =>
    outputsById[outputId]?.attributes.type ??
    outputs.find((output) => output.attributes.output_id === outputId)?.attributes.type ??
    'elasticsearch';

  const { items } = await agentPolicyService.list(soClient, {
    esClient,
    withAgentCount: true,
    page: 1,
    perPage: SO_SEARCH_LIMIT,
  });
  const outputTypes: { [key: string]: AgentsPerOutputType } = {};
  items
    .filter((item) => (item.agents ?? 0) > 0)
    .forEach((item) => {
      const dataOutputType = getOutputTypeById(item.data_output_id || defaultOutputId);
      if (!outputTypes[dataOutputType]) {
        outputTypes[dataOutputType] = {
          output_type: dataOutputType,
          count_as_data: 0,
          count_as_monitoring: 0,
        };
      }
      outputTypes[dataOutputType].count_as_data += item.agents ?? 0;
      const monitoringOutputType = getOutputTypeById(
        item.monitoring_output_id || defaultMonitoringOutputId
      );
      if (!outputTypes[monitoringOutputType]) {
        outputTypes[monitoringOutputType] = {
          output_type: monitoringOutputType,
          count_as_data: 0,
          count_as_monitoring: 0,
        };
      }
      outputTypes[monitoringOutputType].count_as_monitoring += item.agents ?? 0;
    });
  return Object.values(outputTypes);
}
