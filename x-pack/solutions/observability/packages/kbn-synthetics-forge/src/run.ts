/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { SyntheticsApiClient } from './api_client';
import type { ForgeConfig, ForgeOutput, PrivateLocation, CleanupResult } from './types';

const BROWSER_SCRIPT = `
step('Navigate to Elastic', async () => {
  await page.goto('https://www.elastic.co');
});
`;

const ICMP_HOSTS = [
  '8.8.8.8',
  '8.8.4.4',
  '1.1.1.1',
  '1.0.0.1',
  '9.9.9.9',
  '149.112.112.112',
  '208.67.222.222',
  '208.67.220.220',
  '4.2.2.1',
  '4.2.2.2',
  '8.26.56.26',
  '8.20.247.20',
  '94.140.14.14',
  '94.140.15.15',
];

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createMonitorsInBatches<T>(
  items: T[],
  concurrency: number,
  createFn: (item: T) => Promise<string>
): Promise<string[]> {
  const results: string[] = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(createFn));
    results.push(...batchResults);
  }

  return results;
}

export async function cleanup(config: ForgeConfig, log: ToolingLog): Promise<CleanupResult> {
  const client = new SyntheticsApiClient(
    {
      kibanaUrl: config.kibanaUrl,
      username: config.username,
      password: config.password,
    },
    log
  );

  const result: CleanupResult = {
    monitorsDeleted: 0,
    packagePoliciesDeleted: 0,
    privateLocationsDeleted: 0,
    agentsUnenrolled: 0,
    agentPoliciesDeleted: 0,
  };

  const spaceId = config.spaceId;
  log.info(`Cleaning up ALL resources in space: ${spaceId}`);

  // Collect agent policy IDs from private locations BEFORE deleting anything
  const agentPolicyIds: string[] = [];

  // Get ALL private locations in our space
  const privateLocations = await client.getPrivateLocations(spaceId);
  log.info(`Found ${privateLocations.length} private location(s) in space`);
  for (const loc of privateLocations) {
    log.info(`  - "${loc.label}" -> agent policy: ${loc.agentPolicyId}`);
    if (loc.agentPolicyId && !agentPolicyIds.includes(loc.agentPolicyId)) {
      agentPolicyIds.push(loc.agentPolicyId);
    }
  }

  // Get ALL monitors in our space
  const monitors = await client.getMonitors(spaceId);
  log.info(`Found ${monitors.length} monitor(s) in space`);

  // Step 1: Delete package policies for monitors
  log.info('Step 1: Deleting package policies...');
  if (monitors.length > 0) {
    const { deleted, failed } = await client.deletePackagePoliciesForMonitors(monitors, spaceId);
    result.packagePoliciesDeleted = deleted;
    if (deleted > 0) {
      log.success(`Deleted ${deleted} package policies`);
    }
    if (failed > 0) {
      log.warning(`${failed} package policies failed to delete (may not exist)`);
    }
  } else {
    log.info('No package policies to delete');
  }

  // Step 2: Delete ALL monitors in the space
  log.info('Step 2: Deleting monitors...');
  if (monitors.length > 0) {
    const monitorIds = monitors.map((m) => m.config_id || m.id);
    await client.deleteMonitors(monitorIds, spaceId);
    result.monitorsDeleted = monitors.length;
    log.success(`Deleted ${monitors.length} monitors`);
  } else {
    log.info('No monitors to delete');
  }

  // Step 3: Delete ALL private locations in the space
  log.info('Step 3: Deleting private locations...');
  for (const loc of privateLocations) {
    try {
      await client.deletePrivateLocation(loc.id, spaceId);
      result.privateLocationsDeleted++;
      log.success(`Deleted private location: ${loc.label}`);
    } catch (err) {
      log.warning(`Failed to delete private location ${loc.label}: ${err}`);
    }
  }
  if (privateLocations.length === 0) {
    log.info('No private locations to delete');
  }

  // Step 4: Unenroll agents and delete agent policies
  log.info('Step 4: Unenrolling agents and deleting agent policies...');
  for (const policyId of agentPolicyIds) {
    // Unenroll agents first
    const agents = await client.getAgentsForPolicy(policyId);
    if (agents.length > 0) {
      log.info(`Unenrolling ${agents.length} agents from policy ${policyId}`);
      await client.bulkUnenrollAgents(policyId);
      result.agentsUnenrolled += agents.length;
      await delay(2000);
    }

    // Delete policy
    try {
      await client.deleteAgentPolicy(policyId, true);
      result.agentPoliciesDeleted++;
      log.success(`Deleted agent policy: ${policyId}`);
    } catch (err) {
      log.warning(`Failed to delete agent policy ${policyId}: ${err}`);
    }
  }
  if (agentPolicyIds.length === 0) {
    log.info('No agent policies to delete');
  }

  log.info(`
=== CLEANUP SUMMARY ===
  Monitors deleted: ${result.monitorsDeleted}
  Package policies deleted: ${result.packagePoliciesDeleted}
  Private locations deleted: ${result.privateLocationsDeleted}
  Agents unenrolled: ${result.agentsUnenrolled}
  Agent policies deleted: ${result.agentPoliciesDeleted}
=== CLEANUP COMPLETE ===
`);
  return result;
}

export async function run(config: ForgeConfig, log: ToolingLog): Promise<ForgeOutput> {
  const client = new SyntheticsApiClient(
    {
      kibanaUrl: config.kibanaUrl,
      username: config.username,
      password: config.password,
    },
    log
  );

  const { monitorCounts, concurrency, resourcePrefix } = config;
  const totalMonitors =
    monitorCounts.http + monitorCounts.tcp + monitorCounts.icmp + monitorCounts.browser;

  log.info('========================================');
  log.info('Synthetics Forge - Creating Resources');
  log.info('========================================');
  log.info(`HTTP Monitors: ${monitorCounts.http}`);
  log.info(`TCP Monitors: ${monitorCounts.tcp}`);
  log.info(`ICMP Monitors: ${monitorCounts.icmp}`);
  log.info(`Browser Monitors: ${monitorCounts.browser}`);
  log.info(`Total: ${totalMonitors}`);
  log.info(`Concurrency: ${concurrency}`);
  log.info(`Resource Prefix: ${resourcePrefix}`);
  if (config.privateLocationId) {
    log.info(`Using existing Private Location: ${config.privateLocationId}`);
  }

  await client.setupFleet();
  await client.enableSynthetics();

  const space = await client.createSpace(config.spaceId, 'Scalability Test Space');
  log.success(`Space ready: ${space.id}`);

  let agentPolicyId: string;
  let agentPolicyName: string;
  let privateLocation: PrivateLocation;
  let privateLocationLabel: string;

  if (config.privateLocationId) {
    log.info(`Fetching existing private location: ${config.privateLocationId}`);
    privateLocation = await client.getPrivateLocationById(config.privateLocationId, config.spaceId);
    privateLocationLabel = privateLocation.label;
    agentPolicyId = privateLocation.agentPolicyId;
    agentPolicyName = `existing-policy-${agentPolicyId}`;
    log.success(
      `Using existing Private Location: ${privateLocation.label} (${privateLocation.id})`
    );
  } else {
    agentPolicyName = `${resourcePrefix}-policy`;
    const agentPolicy = await client.createAgentPolicy(agentPolicyName);
    agentPolicyId = agentPolicy.id;
    log.success(`Agent Policy ready: ${agentPolicyId}`);

    privateLocationLabel = `${resourcePrefix}-location`;
    privateLocation = await client.createPrivateLocation(
      privateLocationLabel,
      agentPolicyId,
      config.spaceId
    );
    log.success(`Private Location ready: ${privateLocation.id}`);
  }

  const enrollmentToken = await client.getEnrollmentToken(agentPolicyId);
  const kibanaVersion = await client.getKibanaVersion();

  log.info('--- Creating Monitors ---');

  const monitorIds: string[] = [];

  const monitorCreationTasks = [
    {
      type: 'HTTP',
      count: monitorCounts.http,
      creator: client.createHttpMonitor.bind(client),
      getArg: () => 'https://www.elastic.co',
    },
    {
      type: 'TCP',
      count: monitorCounts.tcp,
      creator: client.createTcpMonitor.bind(client),
      getArg: () => 'elastic.co:443',
    },
    {
      type: 'ICMP',
      count: monitorCounts.icmp,
      creator: client.createIcmpMonitor.bind(client),
      getArg: (i: number) => ICMP_HOSTS[i % ICMP_HOSTS.length],
      extraLog: `Distributing across ${ICMP_HOSTS.length} hosts to avoid rate limiting`,
    },
    {
      type: 'Browser',
      count: monitorCounts.browser,
      creator: client.createBrowserMonitor.bind(client),
      getArg: () => BROWSER_SCRIPT,
    },
  ];

  for (const task of monitorCreationTasks) {
    if (task.count > 0) {
      log.info(`Creating ${task.count} ${task.type} monitor(s) with concurrency ${concurrency}`);
      if (task.extraLog) {
        log.info(task.extraLog);
      }
      const indices = Array.from({ length: task.count }, (_, i) => i);
      const ids = await createMonitorsInBatches(indices, concurrency, async (i) => {
        const monitor = await task.creator(
          `Scalability ${task.type} Monitor ${i + 1}`,
          task.getArg(i),
          privateLocation,
          config.spaceId,
          [resourcePrefix]
        );
        return monitor.id;
      });
      monitorIds.push(...ids);
      log.success(`Created ${ids.length} ${task.type} monitor(s)`);
    }
  }

  const monitors = await client.getMonitors(config.spaceId);
  log.success(`Verified ${monitors.length} monitors in space ${config.spaceId}`);

  log.info('========================================');
  log.success('Synthetics Forge Complete');
  log.info('========================================');

  return {
    spaceId: space.id,
    agentPolicyId,
    agentPolicyName,
    privateLocationId: privateLocation.id,
    privateLocationLabel,
    enrollmentToken,
    kibanaVersion,
    monitorIds,
    monitorCount: monitorIds.length,
    kibanaUrl: config.kibanaUrl,
  };
}
