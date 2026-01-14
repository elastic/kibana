/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosInstance, AxiosError } from 'axios';
import axios from 'axios';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ApiClientConfig, PrivateLocation, AgentPolicy, Space, Monitor } from './types';

export class SyntheticsApiClient {
  private client: AxiosInstance;
  private kibanaUrl: string;
  private maxRetries: number;
  private retryDelayMs: number;
  private log: ToolingLog;

  constructor(config: ApiClientConfig, log: ToolingLog) {
    this.kibanaUrl = config.kibanaUrl.replace(/\/$/, '');
    this.maxRetries = 3;
    this.retryDelayMs = 1000;
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

  private async withRetry<T>(operation: () => Promise<T>, context: string): Promise<T> {
    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        const isRetryable =
          lastError.message?.includes('version_conflict') ||
          lastError.message?.includes('409') ||
          lastError.message?.includes('500');

        if (isRetryable && attempt < this.maxRetries) {
          const delay = this.retryDelayMs * Math.pow(2, attempt - 1);
          this.log.warning(`Retry ${attempt}/${this.maxRetries} for ${context} after ${delay}ms`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw lastError;
        }
      }
    }
    throw lastError;
  }

  private handleError(error: unknown, context: string): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const message = axiosError.response?.data
        ? JSON.stringify(axiosError.response.data)
        : axiosError.message;
      throw new Error(`${context}: ${message}`);
    }
    throw error;
  }

  async setupFleet(): Promise<void> {
    this.log.info('Setting up Fleet...');
    const response = await this.client.post('/api/fleet/setup');
    if (response.status !== 200) {
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

    if (response.status !== 200) {
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

    if (response.status !== 200) {
      throw new Error(`Create agent policy failed: ${JSON.stringify(response.data)}`);
    }
    this.log.success(`Agent policy created: ${response.data.item.id}`);
    return response.data.item as AgentPolicy;
  }

  async getPrivateLocations(spaceId?: string): Promise<PrivateLocation[]> {
    const basePath = spaceId ? `/s/${spaceId}` : '';
    const response = await this.client.get(`${basePath}/api/synthetics/private_locations`);
    if (response.status !== 200) {
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
      // Verify the linked agent policy still exists
      const policies = await this.getAgentPolicies();
      const policyExists = policies.some((p) => p.id === found.agentPolicyId);

      if (policyExists) {
        this.log.info(`Private location already exists: ${found.id}`);
        return found;
      } else {
        // Agent policy was deleted, remove orphaned private location
        this.log.warning(
          `Private location ${found.id} has orphaned agent policy (${found.agentPolicyId}), deleting...`
        );
        try {
          const basePath = spaceId ? `/s/${spaceId}` : '';
          const deleteResponse = await this.client.delete(
            `${basePath}/api/synthetics/private_locations/${found.id}`
          );
          this.log.info(`Delete response: ${deleteResponse.status}`);
        } catch (err) {
          this.log.warning(`Failed to delete orphaned location: ${err}`);
        }
        // Wait a moment for deletion to propagate
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    const basePath = spaceId ? `/s/${spaceId}` : '';
    const response = await this.client.post(`${basePath}/api/synthetics/private_locations`, {
      label,
      agentPolicyId,
      geo: { lat: 0, lon: 0 },
      ...(spaceId ? { spaces: [spaceId] } : {}),
    });

    if (response.status !== 200) {
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
      const basePath = spaceId ? `/s/${spaceId}` : '';
      const response = await this.client.post(`${basePath}/api/synthetics/monitors`, {
        type: 'http',
        name,
        urls: url,
        schedule: { number: '3', unit: 'm' },
        locations: [
          { id: privateLocation.id, label: privateLocation.label, isServiceManaged: false },
        ],
        enabled: true,
        timeout: '16',
        tags,
      });

      if (response.status !== 200) {
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
      const basePath = spaceId ? `/s/${spaceId}` : '';
      const response = await this.client.post(`${basePath}/api/synthetics/monitors`, {
        type: 'tcp',
        name,
        hosts: host,
        schedule: { number: '3', unit: 'm' },
        locations: [
          { id: privateLocation.id, label: privateLocation.label, isServiceManaged: false },
        ],
        enabled: true,
        timeout: '16',
        tags,
      });

      if (response.status !== 200) {
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
      const basePath = spaceId ? `/s/${spaceId}` : '';
      const response = await this.client.post(`${basePath}/api/synthetics/monitors`, {
        type: 'icmp',
        name,
        hosts: host,
        schedule: { number: '3', unit: 'm' },
        locations: [
          { id: privateLocation.id, label: privateLocation.label, isServiceManaged: false },
        ],
        enabled: true,
        timeout: '16',
        wait: '1',
        tags,
      });

      if (response.status !== 200) {
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
      const basePath = spaceId ? `/s/${spaceId}` : '';
      const response = await this.client.post(`${basePath}/api/synthetics/monitors`, {
        type: 'browser',
        name,
        schedule: { number: '3', unit: 'm' },
        locations: [
          { id: privateLocation.id, label: privateLocation.label, isServiceManaged: false },
        ],
        enabled: true,
        timeout: '16',
        tags,
        'source.inline.script': script,
        screenshots: 'on',
        synthetics_args: [],
        ignore_https_errors: false,
      });

      if (response.status !== 200) {
        throw new Error(`Create Browser monitor failed: ${JSON.stringify(response.data)}`);
      }
      return response.data as Monitor;
    }, `Browser monitor: ${name}`);
  }

  async createMonitorsBulk(
    monitors: Array<{
      type: 'http' | 'tcp' | 'icmp' | 'browser';
      name: string;
      target: string; // url for http, host for tcp/icmp, script for browser
      tags?: string[];
    }>,
    privateLocation: PrivateLocation,
    spaceId?: string,
    projectName: string = 'scalability-forge'
  ): Promise<{ created: number; failed: number }> {
    if (monitors.length === 0) return { created: 0, failed: 0 };

    // API limits: 250 browser monitors, 1500 lightweight per request
    const BROWSER_LIMIT = 250;
    const LIGHTWEIGHT_LIMIT = 1500;

    // Split monitors by type
    const browserMonitors = monitors.filter((m) => m.type === 'browser');
    const lightweightMonitors = monitors.filter((m) => m.type !== 'browser');

    let totalCreated = 0;
    let totalFailed = 0;
    const basePath = spaceId ? `/s/${spaceId}` : '';

    // Process browser monitors in chunks of 250
    for (let i = 0; i < browserMonitors.length; i += BROWSER_LIMIT) {
      const chunk = browserMonitors.slice(i, i + BROWSER_LIMIT);
      const result = await this.sendBulkRequest(chunk, privateLocation, basePath, projectName, i);
      totalCreated += result.created;
      totalFailed += result.failed;
    }

    // Process lightweight monitors in chunks of 1500
    for (let i = 0; i < lightweightMonitors.length; i += LIGHTWEIGHT_LIMIT) {
      const chunk = lightweightMonitors.slice(i, i + LIGHTWEIGHT_LIMIT);
      const result = await this.sendBulkRequest(chunk, privateLocation, basePath, projectName, i);
      totalCreated += result.created;
      totalFailed += result.failed;
    }

    this.log.info(`Bulk create complete: ${totalCreated} created, ${totalFailed} failed`);
    return { created: totalCreated, failed: totalFailed };
  }

  private async sendBulkRequest(
    monitors: Array<{
      type: 'http' | 'tcp' | 'icmp' | 'browser';
      name: string;
      target: string;
      tags?: string[];
    }>,
    privateLocation: PrivateLocation,
    basePath: string,
    projectName: string,
    batchOffset: number
  ): Promise<{ created: number; failed: number }> {
    const projectMonitors = monitors.map((m, idx) => {
      const uniqueId = `${m.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${
        batchOffset + idx
      }`;
      const base = {
        id: uniqueId,
        name: m.name,
        schedule: 10,
        enabled: true,
        tags: m.tags || [],
        privateLocations: [privateLocation.label],
        locations: [],
      };

      switch (m.type) {
        case 'http':
          return { ...base, type: 'http' as const, urls: m.target };
        case 'tcp':
          return { ...base, type: 'tcp' as const, hosts: m.target };
        case 'icmp':
          return { ...base, type: 'icmp' as const, hosts: m.target };
        case 'browser':
          return {
            ...base,
            type: 'browser' as const,
            'source.inline.script': m.target,
            screenshots: 'on',
          };
      }
    });

    this.log.info(`Bulk creating ${monitors.length} monitors (batch at offset ${batchOffset})`);
    const response = await this.client.put(
      `${basePath}/api/synthetics/project/${projectName}/monitors/_bulk_update`,
      { monitors: projectMonitors }
    );

    if (response.status !== 200) {
      this.log.warning(
        `Bulk create response: ${response.status} - ${JSON.stringify(response.data)}`
      );
    }

    const created = response.data?.createdMonitors?.length || 0;
    const failed = response.data?.failedMonitors?.length || 0;
    return { created, failed };
  }

  async getMonitors(spaceId?: string): Promise<Monitor[]> {
    const basePath = spaceId ? `/s/${spaceId}` : '';
    const allMonitors: Monitor[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await this.client.get(
        `${basePath}/api/synthetics/monitors?perPage=${perPage}&page=${page}`
      );
      if (response.status !== 200) {
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

  async deleteMonitor(monitorId: string, spaceId?: string): Promise<void> {
    await this.deleteMonitors([monitorId], spaceId);
  }

  async deleteMonitors(monitorIds: string[], spaceId?: string): Promise<void> {
    if (monitorIds.length === 0) return;

    const basePath = spaceId ? `/s/${spaceId}` : '';
    const response = await this.client.delete(`${basePath}/api/synthetics/monitors`, {
      data: { ids: monitorIds },
    });

    if (response.status !== 200) {
      this.log.warning(`Bulk delete response: ${response.status}`);
    }
  }

  async deletePrivateLocation(locationId: string, spaceId?: string): Promise<void> {
    const basePath = spaceId ? `/s/${spaceId}` : '';
    await this.client.delete(`${basePath}/api/synthetics/private_locations/${locationId}`);
  }

  async deleteAgentPolicy(policyId: string): Promise<void> {
    await this.client.post('/api/fleet/agent_policies/delete', {
      agentPolicyId: policyId,
    });
  }

  async getAgentPolicies(): Promise<AgentPolicy[]> {
    const response = await this.client.get('/api/fleet/agent_policies');
    if (response.status !== 200) {
      return [];
    }
    return response.data.items as AgentPolicy[];
  }

  async deleteSpace(spaceId: string): Promise<void> {
    await this.client.delete(`/api/spaces/space/${spaceId}`);
  }

  async getEnrollmentToken(agentPolicyId: string): Promise<string> {
    this.log.info(`Fetching enrollment token for policy: ${agentPolicyId}`);
    const response = await this.client.get(
      `/api/fleet/enrollment_api_keys?kuery=policy_id:${agentPolicyId}`
    );

    if (response.status !== 200 || !response.data?.list?.length) {
      throw new Error(`Failed to get enrollment token: ${JSON.stringify(response.data)}`);
    }

    const token = response.data.list[0].api_key;
    this.log.success('Enrollment token retrieved');
    return token;
  }

  async getKibanaVersion(): Promise<string> {
    const response = await this.client.get('/api/status');
    if (response.status !== 200) {
      throw new Error(`Failed to get Kibana version: ${JSON.stringify(response.data)}`);
    }
    return response.data.version.number;
  }
}
