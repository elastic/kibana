/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { AGENTS_INDEX, AgentStatus } from '@kbn/fleet-plugin/common';
import { pick } from 'lodash';
import { FleetAgentGenerator } from '../../../common/endpoint/data_generators/fleet_agent_generator';

const fleetGenerator = new FleetAgentGenerator();

export const checkInFleetAgent = async (
  esClient: Client,
  agentId: string,
  /**
   * The agent status to be sent. If set to `random`, then one will be randomly generated
   */
  agentStatus: AgentStatus | 'random' = 'online'
) => {
  const update = pick(
    fleetGenerator.generateEsHitWithStatus(
      agentStatus === 'random' ? fleetGenerator.randomAgentStatus() : agentStatus
    )._source,
    [
      'last_checkin_status',
      'last_checkin',
      'active',
      'unenrollment_started_at',
      'unenrolled_at',
      'upgrade_started_at',
      'upgraded_at',
    ]
  );

  // Ensure any `undefined` value is set to `null` for the update
  Object.entries(update).forEach(([key, value]) => {
    if (value === undefined) {
      // @ts-expect-error
      update[key] = null;
    }
  });

  await esClient.update({
    index: AGENTS_INDEX,
    id: agentId,
    refresh: 'wait_for',
    retry_on_conflict: 5,
    body: {
      doc: update,
    },
  });
};
