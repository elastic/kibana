/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { settingsService, agentPolicyService, outputService } from '../../services';
import { fetchList, fetchInfo } from '../../services/epm/registry';
import { getRegistryUrl, getDefaultRegistryUrl } from '../../services/epm/registry/registry_url';

import type { IHealthCheck } from '.';

export const checkConfiguration: IHealthCheck = async ({
  soClient,
  logger,
  updateReport,
  updateStatus,
}) => {
  let hasProblem = false;
  updateStatus('running');
  updateReport(``);
  updateReport(`Checking Fleet configuration...`);

  // Check package registry URL
  const registryUrl = getRegistryUrl();
  const defaultRegistryUrl = getDefaultRegistryUrl();
  updateReport(``);
  updateReport(`Package registry URL:`, 2);
  updateReport(registryUrl, 3);
  if (registryUrl !== defaultRegistryUrl) {
    updateReport(`You are using a custom registry URL.`, 2);
  }
  updateReport(
    `Fleet will retrieve installable integrations from the package registry. This URL should be accessible from this Kibana deployment.`,
    2
  );
  try {
    const packageList = await fetchList();
    updateReport(`Retrieved ${packageList.length} installable integrations.`, 3);
    const firstPackage = await fetchInfo(packageList[0].name, packageList[0].version);
    updateReport(
      `Retrieved sample integration information (${firstPackage.name}, v${packageList[0].version})`,
      3
    );
  } catch (e) {
    hasProblem = true;
    updateReport(
      `Unable to verify package registry access. Check Kibana logs for more details:`,
      3
    );
    updateReport(e.message, 3);
    logger.error(e);
  }

  // Check Fleet Server config
  const settings = await settingsService.getSettings(soClient);
  const fleetServerPolicies = await agentPolicyService.list(soClient, {
    perPage: 100,
    kuery: 'ingest-agent-policies.has_fleet_server: true',
  });
  updateReport(``);
  updateReport(`Fleet Server policies:`, 2);
  if (fleetServerPolicies.total === 0) {
    hasProblem = true;
    updateReport(`No Fleet Server policies found. Visit Fleet in Kibana to create a policy.`, 3);
  } else {
    updateReport(
      fleetServerPolicies.items.map(
        (policy) => `${policy.name} (id: ${policy.id}, output id: ${policy.data_output_id})`
      ),
      3
    );
  }
  updateReport(`Fleet Server hosts:`, 2);
  if (settings.fleet_server_hosts.length === 0) {
    hasProblem = true;
    updateReport(`No Fleet Server hosts found. Visit Fleet in Kibana to add a Fleet Server.`, 3);
  } else {
    updateReport(settings.fleet_server_hosts, 3);
    updateReport(
      `Elastic Agents will check-in to Fleet Server, reporting their health and retrieving policy updates, using these host address(es).`,
      2
    );
  }

  // Check outputs
  const outputs = await outputService.list(soClient);
  updateReport(``);
  updateReport(`Fleet outputs:`, 2);
  outputs.items.forEach((output) => {
    updateReport(`${output.name} (id: ${output.id}, type: ${output.type})`, 3);
    if (output.hosts) {
      updateReport(`hosts:`, 4);
      updateReport(output.hosts, 5);
    }
  });

  // Finish and report overall status for this check
  updateReport(``);
  updateReport(`Finished checking Fleet configuration.`);
  updateStatus(hasProblem ? 'problem' : 'healthy');
};
