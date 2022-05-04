/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IHealthCheck } from '.';

export const checkAgents: IHealthCheck = async ({
  soClient,
  esClient,
  logger,
  updateReport,
  updateStatus,
}) => {
  const hasProblem = false;
  updateStatus('running');
  updateReport(`Checking enrolled agents...`);

  // Check Fleet Server agents
  // Stats of all agents and their health

  // Finish and report overall status for this check
  updateReport(``);
  updateReport(`Finished checking enrolled agents.`);
  updateStatus(hasProblem ? 'problem' : 'healthy');
};
