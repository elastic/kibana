/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import type { KbnClient } from '@kbn/test';
import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { AgentEmulatorSettings } from '../types';
import { SettingsStorage } from '../../common/settings_storage';
import { AgentKeepAliveService } from './agent_keep_alive';
import { ActionResponderService } from './action_responder';
import { createRuntimeServices } from '../../common/stack_services';

export interface EmulatorRunContextConstructorOptions {
  username: string;
  password: string;
  kibanaUrl: string;
  elasticsearchUrl: string;
  actionResponseDelay: number;
  checkinInterval: number;
  asSuperuser?: boolean;
  log?: ToolingLog;
}

export class EmulatorRunContext {
  private esClient: Client | undefined = undefined;
  private kbnClient: KbnClient | undefined = undefined;
  private wasStarted: boolean = false;
  private agentKeepAliveService: AgentKeepAliveService | undefined = undefined;
  private actionResponderService: ActionResponderService | undefined = undefined;

  private readonly username: string;
  private readonly password: string;
  private readonly kibanaUrl: string;
  private readonly elasticsearchUrl: string;
  private readonly actionResponseDelay: number;
  private readonly checkinInterval: number;
  private readonly asSuperuser: boolean = false;
  private log: ToolingLog | undefined = undefined;
  private settings: SettingsStorage<AgentEmulatorSettings> | undefined = undefined;

  constructor(options: EmulatorRunContextConstructorOptions) {
    this.username = options.username;
    this.password = options.password;
    this.kibanaUrl = options.kibanaUrl;
    this.elasticsearchUrl = options.elasticsearchUrl;
    this.actionResponseDelay = options.actionResponseDelay;
    this.checkinInterval = options.checkinInterval;
    this.asSuperuser = options.asSuperuser ?? false;
    this.log = options.log;
  }

  async start() {
    if (this.wasStarted) {
      return;
    }

    this.settings = new SettingsStorage<AgentEmulatorSettings>('endpoint_agent_emulator.json', {
      defaultSettings: {
        version: 1,
        endpointLoader: {
          count: 2,
        },
      },
    });

    const { esClient, kbnClient, log } = await createRuntimeServices({
      kibanaUrl: this.kibanaUrl,
      elasticsearchUrl: this.elasticsearchUrl,
      username: this.username,
      password: this.password,
      asSuperuser: this.asSuperuser,
      log: this.log,
    });

    this.esClient = esClient;
    this.kbnClient = kbnClient;
    this.log = log;

    this.agentKeepAliveService = new AgentKeepAliveService(
      esClient,
      kbnClient,
      log,
      this.checkinInterval
    );
    this.agentKeepAliveService.start();

    this.actionResponderService = new ActionResponderService(
      esClient,
      kbnClient,
      log,
      5_000, // Check for actions every 5s
      this.actionResponseDelay
    );
    this.actionResponderService.start();

    this.wasStarted = true;
  }

  async stop(): Promise<void> {
    this.getAgentKeepAliveService().stop();
    this.getActionResponderService().stop();
    this.wasStarted = false;
  }

  protected ensureStarted() {
    if (!this.wasStarted) {
      throw new Error('RunContext instance has not been `.start()`ed!');
    }
  }

  public get whileRunning(): Promise<void> {
    this.ensureStarted();

    return Promise.all([
      this.getActionResponderService().whileRunning,
      this.getAgentKeepAliveService().whileRunning,
    ]).then(() => {});
  }

  getSettingsService(): SettingsStorage<AgentEmulatorSettings> {
    this.ensureStarted();
    return this.settings!;
  }

  getActionResponderService(): ActionResponderService {
    this.ensureStarted();
    return this.actionResponderService!;
  }

  getAgentKeepAliveService(): AgentKeepAliveService {
    this.ensureStarted();
    return this.agentKeepAliveService!;
  }

  getEsClient(): Client {
    this.ensureStarted();
    return this.esClient!;
  }

  getKbnClient(): KbnClient {
    this.ensureStarted();
    return this.kbnClient!;
  }

  getLogger(): ToolingLog {
    this.ensureStarted();
    return this.log!;
  }
}
