/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import _ from 'lodash';

import {
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  OUTPUT_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
} from '../../common';
import type { OutputSOAttributes, AgentPolicy } from '../types';

export interface AgentPoliciesUsage {
  count: number;
  output_types: string[];
}

export const getAgentPoliciesUsage = async (
  soClient: SavedObjectsClientContract
): Promise<AgentPoliciesUsage> => {
  const { saved_objects: outputs } = await soClient.find<OutputSOAttributes>({
    type: OUTPUT_SAVED_OBJECT_TYPE,
    page: 1,
    perPage: SO_SEARCH_LIMIT,
  });

  const defaultOutputId = outputs.find((output) => output.attributes.is_default)?.id || '';

  const outputsById = _.keyBy(outputs, 'id');

  const { saved_objects: agentPolicies, total: totalAgentPolicies } =
    await soClient.find<AgentPolicy>({
      type: AGENT_POLICY_SAVED_OBJECT_TYPE,
      page: 1,
      perPage: SO_SEARCH_LIMIT,
    });

  const uniqueOutputIds = new Set<string>();
  agentPolicies.forEach((agentPolicy) => {
    uniqueOutputIds.add(agentPolicy.attributes.monitoring_output_id || defaultOutputId);
    uniqueOutputIds.add(agentPolicy.attributes.data_output_id || defaultOutputId);
  });

  const uniqueOutputTypes = new Set(
    Array.from(uniqueOutputIds).map((outputId) => {
      return outputsById[outputId]?.attributes.type;
    })
  );

  return {
    count: totalAgentPolicies,
    output_types: Array.from(uniqueOutputTypes),
  };
};
