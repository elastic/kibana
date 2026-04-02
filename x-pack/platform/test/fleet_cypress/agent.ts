/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { ChildProcess } from 'child_process';
import { spawn } from 'child_process';
import { getLatestVersion } from './artifact_manager';
import { Manager } from './resource_manager';

export interface AgentManagerParams {
  user: string;
  password: string;
  kibanaUrl: string;
  esHost: string;
  esPort: string;
}

export interface RequestOptions {
  headers: Record<string, string>;
}

export class AgentManager extends Manager {
  private params: AgentManagerParams;
  private log: ToolingLog;
  private agentProcess?: ChildProcess;
  private requestOptions: RequestOptions;
  constructor(params: AgentManagerParams, log: ToolingLog, requestOptions: RequestOptions) {
    super();
    this.log = log;
    this.params = params;
    this.requestOptions = requestOptions;
  }

  public async setup() {
    this.log.info('Running agent preconfig');
    const response = await fetch(`${this.params.kibanaUrl}/api/fleet/agents/setup`, {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'content-type': 'application/json',
        ...this.requestOptions.headers,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to setup fleet agents: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  public async startAgent() {
    this.log.info('Getting agent enrollment key');
    const apiKeysResponse = await fetch(this.params.kibanaUrl + '/api/fleet/enrollment_api_keys', {
      headers: this.requestOptions.headers,
    });
    if (!apiKeysResponse.ok) {
      throw new Error(
        `Failed to get enrollment API keys: ${apiKeysResponse.status} ${apiKeysResponse.statusText}`
      );
    }
    const apiKeys = await apiKeysResponse.json();
    const policy = apiKeys.items[1];

    this.log.info('Running the agent');

    const artifact = `docker.elastic.co/elastic-agent/elastic-agent:${await getLatestVersion()}`;
    this.log.info(artifact);

    const args = [
      'run',
      '--add-host',
      'host.docker.internal:host-gateway',
      '--env',
      'FLEET_ENROLL=1',
      '--env',
      `FLEET_URL=http://host.docker.internal:8220`,
      '--env',
      `FLEET_ENROLLMENT_TOKEN=${policy.api_key}`,
      '--env',
      'FLEET_INSECURE=true',
      '--rm',
      artifact,
    ];

    this.agentProcess = spawn('docker', args, { stdio: 'inherit' });

    // Wait til we see the agent is online
    let done = false;
    let retries = 0;
    while (!done) {
      await new Promise((r) => setTimeout(r, 5000));
      const agentsResponse = await fetch(`${this.params.kibanaUrl}/api/fleet/agents`, {
        headers: this.requestOptions.headers,
      });
      if (!agentsResponse.ok) {
        throw new Error(
          `Failed to get fleet agents: ${agentsResponse.status} ${agentsResponse.statusText}`
        );
      }
      const agents = await agentsResponse.json();
      done = agents.items[0]?.status === 'online';
      if (++retries > 12) {
        this.log.error('Giving up on enrolling the agent after a minute');
        throw new Error('Agent timed out while coming online');
      }
    }

    return { policyId: policy.policy_id as string };
  }

  protected _cleanup() {
    this.log.info('Cleaning up the agent process');
    if (this.agentProcess) {
      if (!this.agentProcess.kill(9)) {
        this.log.warning('Unable to kill agent process');
      }

      this.agentProcess.on('close', () => {
        this.log.info('Agent process closed');
      });
      delete this.agentProcess;
    }
    return;
  }
}
