/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { SyntheticsApiClient } from './api_client';
import type { ForgeConfig, ForgeOutput, PrivateLocation } from './types';

const BROWSER_SCRIPT = `
step('Navigate to Elastic', async () => {
  await page.goto('https://www.elastic.co');
});
`;

// ICMP targets to distribute load and avoid rate limiting
const ICMP_HOSTS = [
  '8.8.8.8', // Google DNS
  '8.8.4.4', // Google DNS
  '1.1.1.1', // Cloudflare
  '1.0.0.1', // Cloudflare
  '9.9.9.9', // Quad9
  '149.112.112.112', // Quad9
  '208.67.222.222', // OpenDNS
  '208.67.220.220', // OpenDNS
  '4.2.2.1', // Level3
  '4.2.2.2', // Level3
  '8.26.56.26', // Comodo
  '8.20.247.20', // Comodo
  '94.140.14.14', // AdGuard
  '94.140.15.15', // AdGuard
];

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

export async function cleanup(config: ForgeConfig, log: ToolingLog): Promise<void> {
  const client = new SyntheticsApiClient(
    {
      kibanaUrl: config.kibanaUrl,
      username: config.username,
      password: config.password,
    },
    log
  );

  log.info(`Cleaning up resources with prefix: ${config.resourcePrefix}`);

  // Step 1: Delete all monitors (with retries until all are gone)
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const monitors = await client.getMonitors(config.spaceId);
      log.info(`Found ${monitors.length} total monitors in space ${config.spaceId}`);

      const taggedMonitors = monitors.filter(
        (m) => m.tags?.includes(config.resourcePrefix) || m.name.startsWith('Scalability ')
      );

      if (taggedMonitors.length === 0) {
        log.info('No monitors to delete');
        break;
      }

      log.info(`Deleting ${taggedMonitors.length} monitors (attempt ${attempt}/${maxRetries})`);
      const monitorIds = taggedMonitors.map((m) => m.config_id || m.id);
      await client.deleteMonitors(monitorIds, config.spaceId);
      log.success(`Deleted ${taggedMonitors.length} monitors`);

      // Wait for deletion to propagate
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify deletion
      const remaining = await client.getMonitors(config.spaceId);
      const remainingTagged = remaining.filter(
        (m) => m.tags?.includes(config.resourcePrefix) || m.name.startsWith('Scalability ')
      );
      if (remainingTagged.length === 0) {
        log.success('All monitors deleted successfully');
        break;
      } else {
        log.warning(`${remainingTagged.length} monitors still remain, retrying...`);
      }
    } catch (err) {
      log.warning(`Error during monitor cleanup (attempt ${attempt}): ${err}`);
    }
  }

  // Step 2: Delete private locations (retry if monitors were blocking)
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const locations = await client.getPrivateLocations(config.spaceId);
      const taggedLocations = locations.filter((l) =>
        l.label.toLowerCase().includes(config.resourcePrefix.toLowerCase())
      );

      if (taggedLocations.length === 0) {
        log.info('No private locations to delete');
        break;
      }

      let allDeleted = true;
      for (const location of taggedLocations) {
        log.info(`Deleting private location: ${location.label} (attempt ${attempt}/${maxRetries})`);
        try {
          await client.deletePrivateLocation(location.id, config.spaceId);
          log.success(`Deleted private location: ${location.label}`);
        } catch (err) {
          log.warning(`Failed to delete private location: ${err}`);
          allDeleted = false;
        }
      }

      if (allDeleted) break;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (err) {
      log.warning(`Error during private location cleanup: ${err}`);
    }
  }

  // Step 3: Delete agent policies
  try {
    const policies = await client.getAgentPolicies();
    const taggedPolicies = policies.filter((p) =>
      p.name.toLowerCase().includes(config.resourcePrefix.toLowerCase())
    );
    for (const policy of taggedPolicies) {
      log.info(`Deleting agent policy: ${policy.name}`);
      try {
        await client.deleteAgentPolicy(policy.id);
        log.success(`Deleted agent policy: ${policy.name}`);
      } catch (err) {
        log.warning(`Failed to delete agent policy (may have agents attached): ${err}`);
      }
    }
  } catch (err) {
    log.warning(`Error during agent policy cleanup: ${err}`);
  }

  log.success('Cleanup complete');
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
    // Use existing private location (skip creating agent policy and private location)
    log.info(`Fetching existing private location: ${config.privateLocationId}`);
    privateLocation = await client.getPrivateLocationById(config.privateLocationId, config.spaceId);
    privateLocationLabel = privateLocation.label;
    agentPolicyId = privateLocation.agentPolicyId;
    agentPolicyName = `existing-policy-${agentPolicyId}`;
    log.success(
      `Using existing Private Location: ${privateLocation.label} (${privateLocation.id})`
    );
  } else {
    // Create new agent policy and private location (default behavior)
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

  if (monitorCounts.http > 0) {
    log.info(`Creating ${monitorCounts.http} HTTP monitor(s) with concurrency ${concurrency}`);
    const httpIndices = Array.from({ length: monitorCounts.http }, (_, i) => i);
    const httpIds = await createMonitorsInBatches(httpIndices, concurrency, async (i) => {
      const monitor = await client.createHttpMonitor(
        `Scalability HTTP Monitor ${i + 1}`,
        'https://www.elastic.co',
        privateLocation,
        config.spaceId,
        [resourcePrefix]
      );
      return monitor.id;
    });
    monitorIds.push(...httpIds);
    log.success(`Created ${httpIds.length} HTTP monitor(s)`);
  }

  if (monitorCounts.tcp > 0) {
    log.info(`Creating ${monitorCounts.tcp} TCP monitor(s) with concurrency ${concurrency}`);
    const tcpIndices = Array.from({ length: monitorCounts.tcp }, (_, i) => i);
    const tcpIds = await createMonitorsInBatches(tcpIndices, concurrency, async (i) => {
      const monitor = await client.createTcpMonitor(
        `Scalability TCP Monitor ${i + 1}`,
        'elastic.co:443',
        privateLocation,
        config.spaceId,
        [resourcePrefix]
      );
      return monitor.id;
    });
    monitorIds.push(...tcpIds);
    log.success(`Created ${tcpIds.length} TCP monitor(s)`);
  }

  if (monitorCounts.icmp > 0) {
    log.info(`Creating ${monitorCounts.icmp} ICMP monitor(s) with concurrency ${concurrency}`);
    log.info(`Distributing across ${ICMP_HOSTS.length} hosts to avoid rate limiting`);
    const icmpIndices = Array.from({ length: monitorCounts.icmp }, (_, i) => i);
    const icmpIds = await createMonitorsInBatches(icmpIndices, concurrency, async (i) => {
      const host = ICMP_HOSTS[i % ICMP_HOSTS.length];
      const monitor = await client.createIcmpMonitor(
        `Scalability ICMP Monitor ${i + 1}`,
        host,
        privateLocation,
        config.spaceId,
        [resourcePrefix]
      );
      return monitor.id;
    });
    monitorIds.push(...icmpIds);
    log.success(`Created ${icmpIds.length} ICMP monitor(s)`);
  }

  if (monitorCounts.browser > 0) {
    log.info(
      `Creating ${monitorCounts.browser} Browser monitor(s) with concurrency ${concurrency}`
    );
    const browserIndices = Array.from({ length: monitorCounts.browser }, (_, i) => i);
    const browserIds = await createMonitorsInBatches(browserIndices, concurrency, async (i) => {
      const monitor = await client.createBrowserMonitor(
        `Scalability Browser Monitor ${i + 1}`,
        BROWSER_SCRIPT,
        privateLocation,
        config.spaceId,
        [resourcePrefix]
      );
      return monitor.id;
    });
    monitorIds.push(...browserIds);
    log.success(`Created ${browserIds.length} Browser monitor(s)`);
  }

  // Verify
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
