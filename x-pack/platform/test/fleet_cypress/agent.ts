/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import axios, { AxiosRequestConfig } from 'axios';
import { ChildProcess, spawn } from 'child_process';
import { getLatestVersion } from './artifact_manager';
import { Manager } from './resource_manager';

export interface AgentManagerParams {
  user: string;
  password: string;
  kibanaUrl: string;
  esHost: string;
  esPort: string;
}

export class AgentManager extends Manager {
  private params: AgentManagerParams;
  private log: ToolingLog;
  private agentProcess?: ChildProcess;
  private requestOptions: AxiosRequestConfig;
  constructor(params: AgentManagerParams, log: ToolingLog, requestOptions: AxiosRequestConfig) {
    super();
    this.log = log;
    this.params = params;
    this.requestOptions = requestOptions;
  }

  public async setup() {
    this.log.info('Running agent preconfig');
    return await axios.post(
      `${this.params.kibanaUrl}/api/fleet/agents/setup`,
      {},
      this.requestOptions
    );
  }

  public async startAgent() {
    this.log.info('Getting agent enrollment key');
    const { data: apiKeys } = await axios.get(
      this.params.kibanaUrl + '/api/fleet/enrollment_api_keys',
      this.requestOptions
    );
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
      const { data: agents } = await axios.get(
        `${this.params.kibanaUrl}/api/fleet/agents`,
        this.requestOptions
      );
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
