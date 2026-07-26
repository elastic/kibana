/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosInstance, AxiosResponse } from 'axios';
import axios from 'axios';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ApiClientConfig, PrivateLocation, AgentPolicy, Space, Monitor } from './types';

const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;
const BATCH_SIZE = 50;

export class SyntheticsApiClient {
  private client: AxiosInstance;
  private kibanaUrl: string;
  private maxRetries: number;
  private retryDelayMs: number;
  private log: ToolingLog;

  constructor(config: ApiClientConfig, log: ToolingLog) {
    this.kibanaUrl = config.kibanaUrl.replace(/\/$/, '');
    this.maxRetries = DEFAULT_RETRY_COUNT;
    this.retryDelayMs = DEFAULT_RETRY_DELAY_MS;
    this.log = log;
    this.client = axios.create({
      baseURL: this.kibanaUrl,
      auth: {
        username: config.username,
        password: config.password,
      },
      headers: {
        'kbn-xsrf': 'true',
        'x-elastic-internal-origin': 'synthetics-forge',
        'elastic-api-version': '2023-10-31',
      },
      validateStatus: () => true,
    });
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    context: string,
    retries: number = this.maxRetries
  ): Promise<T> {
    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        const isRetryable =
          lastError.message?.includes('version_conflict') ||
          lastError.message?.includes('409') ||
          lastError.message?.includes('500') ||
          lastError.message?.includes('ECONNREFUSED') ||
          lastError.message?.includes('timeout');

        if (isRetryable && attempt < retries) {
          const delay = this.retryDelayMs * Math.pow(2, attempt - 1);
          this.log.debug(`Retry ${attempt}/${retries} for ${context} after ${delay}ms`);
          await this.delay(delay);
        } else {
          throw lastError;
        }
      }
    }
    throw lastError;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isSuccessResponse(response: AxiosResponse): boolean {
    return response.status >= 200 && response.status < 300;
  }

  private getBasePath(spaceId?: string): string {
    return spaceId && spaceId !== 'default' ? `/s/${spaceId}` : '';
  }

  async setupFleet(): Promise<void> {
    this.log.info('Setting up Fleet...');
    const response = await this.client.post('/api/fleet/setup');
    if (!this.isSuccessResponse(response)) {
      throw new Error(`Fleet setup failed: ${JSON.stringify(response.data)}`);
    }
    this.log.success('Fleet setup complete');
  }

  async enableSynthetics(): Promise<void> {
    this.log.info('Enabling Synthetics...');
    const response = await this.client.put('/internal/synthetics/service/enablement');
    if (response.status !== 200 && response.status !== 409) {
      throw new Error(`Enable Synthetics failed: ${JSON.stringify(response.data)}`);
    }
    this.log.success('Synthetics enabled');
  }

  async createSpace(spaceId: string, name: string): Promise<Space> {
    this.log.info(`Creating space: ${spaceId}`);

    const existingResponse = await this.client.get(`/api/spaces/space/${spaceId}`);
    if (existingResponse.status === 200) {
      this.log.info(`Space ${spaceId} already exists`);
      return existingResponse.data as Space;
    }

    const response = await this.client.post('/api/spaces/space', {
      id: spaceId,
      name,
      description: 'Space for Synthetics scalability testing',
    });

    if (!this.isSuccessResponse(response)) {
      throw new Error(`Create space failed: ${JSON.stringify(response.data)}`);
    }
    this.log.success(`Space created: ${spaceId}`);
    return response.data as Space;
  }

  async createAgentPolicy(name: string): Promise<AgentPolicy> {
    this.log.info(`Creating agent policy: ${name}`);

    const existing = await this.getAgentPolicies();
    const found = existing.find((p) => p.name === name);
    if (found) {
      this.log.info(`Agent policy already exists: ${found.id}`);
      return found;
    }

    const response = await this.client.post('/api/fleet/agent_policies?sys_monitoring=true', {
      name,
      description: 'Agent policy for Synthetics scalability testing',
      namespace: 'default',
      monitoring_enabled: ['logs', 'metrics'],
    });

    if (!this.isSuccessResponse(response)) {
      throw new Error(`Create agent policy failed: ${JSON.stringify(response.data)}`);
    }
    this.log.success(`Agent policy created: ${response.data.item.id}`);
    return response.data.item as AgentPolicy;
  }

  async getPrivateLocations(spaceId?: string): Promise<PrivateLocation[]> {
    const basePath = this.getBasePath(spaceId);
    const response = await this.client.get(`${basePath}/api/synthetics/private_locations`);
    if (!this.isSuccessResponse(response)) {
      return [];
    }
    return response.data as PrivateLocation[];
  }

  async getPrivateLocationById(locationId: string, spaceId?: string): Promise<PrivateLocation> {
    const locations = await this.getPrivateLocations(spaceId);
    const found = locations.find((loc) => loc.id === locationId);
    if (!found) {
      throw new Error(`Private location not found: ${locationId}`);
    }
    return found;
  }

  async createPrivateLocation(
    label: string,
    agentPolicyId: string,
    spaceId?: string
  ): Promise<PrivateLocation> {
    this.log.info(`Creating private location: ${label}`);

    const existing = await this.getPrivateLocations(spaceId);
    const found = existing.find((loc) => loc.label === label);
    if (found) {
      const policies = await this.getAgentPolicies();
      const policyExists = policies.some((p) => p.id === found.agentPolicyId);

      if (policyExists) {
        this.log.info(`Private location already exists: ${found.id}`);
        return found;
      } else {
        this.log.warning(
          `Private location ${found.id} references a deleted agent policy (${found.agentPolicyId}), recreating...`
        );
        try {
          await this.deletePrivateLocation(found.id, spaceId);
        } catch (err) {
          this.log.warning(`Failed to delete orphaned location: ${err}`);
        }
        await this.delay(1000);
      }
    }

    const basePath = this.getBasePath(spaceId);
    const response = await this.client.post(`${basePath}/api/synthetics/private_locations`, {
      label,
      agentPolicyId,
      geo: { lat: 0, lon: 0 },
      ...(spaceId ? { spaces: [spaceId] } : {}),
    });

    if (!this.isSuccessResponse(response)) {
      throw new Error(`Create private location failed: ${JSON.stringify(response.data)}`);
    }
    this.log.success(`Private location created: ${response.data.id}`);
    return response.data as PrivateLocation;
  }

  async createHttpMonitor(
    name: string,
    url: string,
    privateLocation: PrivateLocation,
    spaceId?: string,
    tags: string[] = []
  ): Promise<Monitor> {
    return this.withRetry(async () => {
      this.log.debug(`Creating HTTP monitor: ${name}`);
      const basePath = this.getBasePath(spaceId);
      const response = await this.client.post(`${basePath}/api/synthetics/monitors`, {
        type: 'http',
        name,
        urls: url,
        schedule: { number: '3', unit: 'm' },
        locations: [{ id: privateLocation.id, isServiceManaged: false }],
        enabled: true,
        timeout: '16',
        tags,
      });

      if (!this.isSuccessResponse(response)) {
        throw new Error(`Create HTTP monitor failed: ${JSON.stringify(response.data)}`);
      }
      return response.data as Monitor;
    }, `HTTP monitor: ${name}`);
  }

  async createTcpMonitor(
    name: string,
    host: string,
    privateLocation: PrivateLocation,
    spaceId?: string,
    tags: string[] = []
  ): Promise<Monitor> {
    return this.withRetry(async () => {
      this.log.debug(`Creating TCP monitor: ${name}`);
      const basePath = this.getBasePath(spaceId);
      const response = await this.client.post(`${basePath}/api/synthetics/monitors`, {
        type: 'tcp',
        name,
        hosts: host,
        schedule: { number: '3', unit: 'm' },
        locations: [{ id: privateLocation.id, isServiceManaged: false }],
        enabled: true,
        timeout: '16',
        tags,
      });

      if (!this.isSuccessResponse(response)) {
        throw new Error(`Create TCP monitor failed: ${JSON.stringify(response.data)}`);
      }
      return response.data as Monitor;
    }, `TCP monitor: ${name}`);
  }

  async createIcmpMonitor(
    name: string,
    host: string,
    privateLocation: PrivateLocation,
    spaceId?: string,
    tags: string[] = []
  ): Promise<Monitor> {
    return this.withRetry(async () => {
      this.log.debug(`Creating ICMP monitor: ${name}`);
      const basePath = this.getBasePath(spaceId);
      const response = await this.client.post(`${basePath}/api/synthetics/monitors`, {
        type: 'icmp',
        name,
        hosts: host,
        schedule: { number: '3', unit: 'm' },
        locations: [{ id: privateLocation.id, isServiceManaged: false }],
        enabled: true,
        timeout: '16',
        wait: '1',
        tags,
      });

      if (!this.isSuccessResponse(response)) {
        throw new Error(`Create ICMP monitor failed: ${JSON.stringify(response.data)}`);
      }
      return response.data as Monitor;
    }, `ICMP monitor: ${name}`);
  }

  async createBrowserMonitor(
    name: string,
    script: string,
    privateLocation: PrivateLocation,
    spaceId?: string,
    tags: string[] = []
  ): Promise<Monitor> {
    return this.withRetry(async () => {
      this.log.debug(`Creating Browser monitor: ${name}`);
      const basePath = this.getBasePath(spaceId);
      const response = await this.client.post(`${basePath}/api/synthetics/monitors`, {
        type: 'browser',
        name,
        schedule: { number: '3', unit: 'm' },
        locations: [{ id: privateLocation.id, isServiceManaged: false }],
        enabled: true,
        timeout: null,
        tags,
        'source.inline.script': script,
        screenshots: 'on',
        synthetics_args: [],
        ignore_https_errors: false,
      });

      if (!this.isSuccessResponse(response)) {
        throw new Error(`Create Browser monitor failed: ${JSON.stringify(response.data)}`);
      }
      return response.data as Monitor;
    }, `Browser monitor: ${name}`);
  }

  async getMonitors(spaceId?: string): Promise<Monitor[]> {
    const basePath = this.getBasePath(spaceId);
    const allMonitors: Monitor[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await this.client.get(
        `${basePath}/api/synthetics/monitors?perPage=${perPage}&page=${page}`
      );
      if (!this.isSuccessResponse(response)) {
        throw new Error(`Get monitors failed: ${JSON.stringify(response.data)}`);
      }

      const monitors = response.data.monitors as Monitor[];
      allMonitors.push(...monitors);

      if (monitors.length < perPage) {
        break;
      }
      page++;
    }

    return allMonitors;
  }

  async deleteMonitors(monitorIds: string[], spaceId?: string): Promise<void> {
    if (monitorIds.length === 0) return;

    const basePath = this.getBasePath(spaceId);
    const response = await this.client.delete(`${basePath}/api/synthetics/monitors`, {
      data: { ids: monitorIds },
    });

    if (!this.isSuccessResponse(response)) {
      this.log.warning(`Bulk delete monitors response: ${response.status}`);
    }
  }

  async deletePrivateLocation(locationId: string, spaceId?: string): Promise<void> {
    const basePath = this.getBasePath(spaceId);
    const response = await this.client.delete(
      `${basePath}/api/synthetics/private_locations/${locationId}`
    );
    if (!this.isSuccessResponse(response) && response.status !== 404) {
      throw new Error(`Delete private location failed: ${JSON.stringify(response.data)}`);
    }
  }

  async deleteAgentPolicy(policyId: string, force: boolean = false): Promise<void> {
    const response = await this.client.post('/api/fleet/agent_policies/delete', {
      agentPolicyId: policyId,
      force,
    });
    if (!this.isSuccessResponse(response) && response.status !== 404) {
      throw new Error(`Delete agent policy failed: ${JSON.stringify(response.data)}`);
    }
  }

  async getAgentsForPolicy(agentPolicyId: string): Promise<Array<{ id: string; status: string }>> {
    const response = await this.client.get(
      `/api/fleet/agents?kuery=policy_id:${agentPolicyId}&perPage=1000`
    );
    if (!this.isSuccessResponse(response)) {
      return [];
    }
    return response.data.items || [];
  }

  async bulkUnenrollAgents(agentPolicyId: string): Promise<void> {
    // Use bulk unenroll API
    const response = await this.client.post('/api/fleet/agents/bulk_unenroll', {
      agents: `policy_id:${agentPolicyId}`,
      force: true,
      revoke: true,
    });

    if (!this.isSuccessResponse(response)) {
      this.log.warning(
        `Bulk unenroll response: ${response.status} - ${JSON.stringify(response.data)}`
      );
    }
  }

  async getAgentPolicies(): Promise<AgentPolicy[]> {
    const response = await this.client.get('/api/fleet/agent_policies?perPage=1000');
    if (!this.isSuccessResponse(response)) {
      return [];
    }
    return response.data.items as AgentPolicy[];
  }

  async getEnrollmentToken(agentPolicyId: string): Promise<string> {
    this.log.info(`Fetching enrollment token for policy: ${agentPolicyId}`);
    const response = await this.client.get(
      `/api/fleet/enrollment_api_keys?kuery=policy_id:${agentPolicyId}`
    );

    if (!this.isSuccessResponse(response) || !response.data?.list?.length) {
      throw new Error(`Failed to get enrollment token: ${JSON.stringify(response.data)}`);
    }

    const token = response.data.list[0].api_key;
    this.log.success('Enrollment token retrieved');
    return token;
  }

  async getKibanaVersion(): Promise<string> {
    const response = await this.client.get('/api/status');
    if (!this.isSuccessResponse(response)) {
      throw new Error(`Failed to get Kibana version: ${JSON.stringify(response.data)}`);
    }
    return response.data.version.number;
  }

  async deletePackagePoliciesForMonitors(
    monitors: Array<{
      config_id?: string;
      id: string;
      locations?: Array<{ id: string; isServiceManaged: boolean }>;
    }>,
    spaceId: string
  ): Promise<{ deleted: number; failed: number }> {
    const policyIds: string[] = [];

    for (const monitor of monitors) {
      const configId = monitor.config_id || monitor.id;
      if (monitor.locations) {
        for (const loc of monitor.locations) {
          if (!loc.isServiceManaged) {
            const policyId = `${configId}-${loc.id}-${spaceId}`;
            if (!policyIds.includes(policyId)) {
              policyIds.push(policyId);
            }
          }
        }
      }
    }

    if (policyIds.length === 0) {
      return { deleted: 0, failed: 0 };
    }

    this.log.info(`Deleting ${policyIds.length} package policies`);

    let totalDeleted = 0;
    let totalFailed = 0;

    for (let i = 0; i < policyIds.length; i += BATCH_SIZE) {
      const batch = policyIds.slice(i, i + BATCH_SIZE);

      try {
        const response = await this.client.post('/api/fleet/package_policies/delete', {
          packagePolicyIds: batch,
          force: true,
        });

        if (this.isSuccessResponse(response)) {
          totalDeleted += batch.length;
        } else {
          totalFailed += batch.length;
        }
      } catch (err) {
        this.log.warning(`Error deleting package policies: ${err}`);
        totalFailed += batch.length;
      }
    }

    return { deleted: totalDeleted, failed: totalFailed };
  }
}
