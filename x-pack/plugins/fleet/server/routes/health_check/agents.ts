/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { keyBy } from 'lodash';

import { getFleetServers } from '../../services/fleet_server';
import { getAllAgentsByKuery } from '../../services/agents';

import type { IHealthCheck } from '.';

export const checkAgents: IHealthCheck = async ({
  soClient,
  esClient,
  logger,
  updateReport,
  updateStatus,
}) => {
  let hasProblem = false;
  updateStatus('running');
  updateReport(`Checking enrolled agents...`);

  // Fetch all agent information for cross-referencing
  const agents = await getAllAgentsByKuery(esClient, { showInactive: false });
  const agentsById = keyBy(agents.agents, 'id');

  // Check Fleet Server agents
  const fsAgents = await getFleetServers(esClient);
  const fsAgentIds = fsAgents.hits.filter((fs) => !!fs._source).map((fs) => fs._source!.agent.id);
  updateReport(``);
  updateReport(`Fleet Servers:`);
  if (fsAgentIds.length === 0) {
    hasProblem = true;
    updateReport(
      `No Fleet Servers registered to enroll agents into. Visit Fleet in Kibana to add a Fleet Server.`,
      3
    );
  } else {
    let hasHealthyFS = false;
    fsAgentIds.forEach((fsId) => {
      const fsAgent = agentsById[fsId];
      if (!fsAgent) {
        updateReport(fsId, 3);
        updateReport(`This Fleet Server is not active.`, 4);
      } else {
        updateReport(fsAgent.local_metadata?.host?.hostname || fsId, 3);
        updateReport(`id: ${fsId}`, 4);
        updateReport(`status: ${fsAgent.status}`, 4);
        if (fsAgent.status === 'online') {
          hasHealthyFS = true;
        }
      }
    });
    if (!hasHealthyFS) {
      hasProblem = true;
      updateReport(`There are no healthy Fleet Servers.`, 3);
    }
  }
  updateReport(
    `Make sure that the Fleet Servers host address(es) are added to Fleet Settings in Kibana so that agents know where to enroll.`
  );

  // Stats of all agents and their health

  // Finish and report overall status for this check
  updateReport(``);
  updateReport(`Finished checking enrolled agents.`);
  updateStatus(hasProblem ? 'problem' : 'healthy');
};
