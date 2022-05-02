/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { settingsService, getRegistryUrl } from '../../services';

import type { IHealthCheck } from '.';

export const checkConfiguration: IHealthCheck = async ({
  soClient,
  esClient,
  updateReport,
  updateStatus,
}) => {
  let hasProblem = false;
  updateStatus('running');
  updateReport(``);
  updateReport(`Checking Fleet configuration...`);
  const settings = await settingsService.getSettings(soClient);

  // Check package registry URL
  updateReport(``);
  updateReport(`Package registry URL:`, 2);
  updateReport(getRegistryUrl(), 3);
  updateReport(
    `Fleet will retrieve installable integrations from the package registry. This URL should be accessible from this Kibana deployment.`,
    2
  );

  // Check Fleet Server hosts
  updateReport(``);
  updateReport(`Fleet Server hosts:`, 2);
  if (settings.fleet_server_hosts.length === 0) {
    hasProblem = true;
    updateReport(
      `No Fleet Server hosts found. Visit the Fleet User Guide to add a Fleet Server.`,
      3
    );
  } else {
    updateReport(settings.fleet_server_hosts, 3);
    updateReport(
      `Elastic Agents will check-in to Fleet, reporting their health and retrieving policy updates, using these host address(es).`,
      2
    );
  }
  updateReport(``);

  // Check outputs

  updateReport(`Finished checking Fleet configuration.`);
  updateStatus(hasProblem ? 'problem' : 'healthy');
};
