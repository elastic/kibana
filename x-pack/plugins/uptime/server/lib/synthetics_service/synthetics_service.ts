/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { ValuesType } from 'utility-types';

import {
  CoreStart,
  KibanaRequest,
  Logger,
  SavedObjectsClient,
} from '../../../../../../src/core/server';
import {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../../task_manager/server';
import { UptimeServerSetup } from '../adapters';
import { installSyntheticsIndexTemplates } from '../../rest_api/synthetics_service/install_index_templates';
import { SyntheticsServiceApiKey } from '../../../common/runtime_types/synthetics_service_api_key';
import { getAPIKeyForSyntheticsService } from './get_api_key';
import { SyntheticsMonitorSavedObject } from '../../../common/types';
import { syntheticsMonitorType } from '../saved_objects/synthetics_monitor';
import { getEsHosts } from './get_es_hosts';
import { UptimeConfig } from '../../../common/config';
import { MonitorConfigs, ServiceAPIClient } from './service_api_client';

const SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_TYPE =
  'UPTIME:SyntheticsService:Sync-Saved-Monitor-Objects';
const SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID = 'UPTIME:SyntheticsService:sync-task';

export class SyntheticsService {
  private logger: Logger;
  private readonly server: UptimeServerSetup;
  private apiClient: ServiceAPIClient;

  private readonly config: UptimeConfig;
  private readonly esHosts: string[];

  private apiKey: SyntheticsServiceApiKey | undefined;

  constructor(logger: Logger, server: UptimeServerSetup) {
    this.logger = logger;
    this.server = server;
    this.config = server.config;

    const { manifestUrl, username, password } = this.config.unsafe.service;

    this.apiClient = new ServiceAPIClient(manifestUrl, username, password, logger);

    this.esHosts = getEsHosts({ config: this.config, cloud: server.cloud });
  }

  public init(coreStart: CoreStart) {
    // TODO: Figure out fake kibana requests to handle API keys on start up
    // getAPIKeyForSyntheticsService({ server: this.server }).then((apiKey) => {
    //   if (apiKey) {
    //     this.apiKey = apiKey;
    //   }
    // });

    this.setupIndexTemplates(coreStart);
  }

  private setupIndexTemplates(coreStart: CoreStart) {
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const savedObjectsClient = new SavedObjectsClient(
      coreStart.savedObjects.createInternalRepository()
    );

    installSyntheticsIndexTemplates({
      esClient,
      server: this.server,
      savedObjectsClient,
    }).then(
      (result) => {
        if (result.name === 'synthetics' && result.install_status === 'installed') {
          this.logger.info('Installed synthetics index templates');
        } else if (result.name === 'synthetics' && result.install_status === 'install_failed') {
          this.logger.warn(new IndexTemplateInstallationError());
        }
      },
      () => {
        this.logger.warn(new IndexTemplateInstallationError());
      }
    );
  }

  public registerSyncTask(taskManager: TaskManagerSetupContract) {
    const service = this;

    taskManager.registerTaskDefinitions({
      [SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_TYPE]: {
        title: 'Synthetics Service - Sync Saved Monitors',
        description: 'This task periodically pushes saved monitors to Synthetics Service.',
        timeout: '1m',
        maxAttempts: 3,
        maxConcurrency: 1,

        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            // Perform the work of the task. The return value should fit the TaskResult interface.
            async run() {
              const { state } = taskInstance;

              await service.pushConfigs();

              return { state };
            },
            async cancel() {
              service.logger?.warn(`Task ${SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID} timed out`);
            },
          };
        },
      },
    });
  }

  public scheduleSyncTask(taskManager: TaskManagerStartContract) {
    taskManager
      .ensureScheduled({
        id: SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID,
        taskType: SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_TYPE,
        schedule: {
          interval: '1m',
        },
        params: {},
        state: {},
        scope: ['uptime'],
      })
      .then((_result) => {
        this.logger?.info(`Task ${SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID} scheduled. `);
      })
      .catch((e) => {
        this.logger?.error(
          `Error running task: ${SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID}, `,
          e?.message() ?? e
        );
      });
  }

  async getOutput(request?: KibanaRequest) {
    if (!this.apiKey) {
      try {
        this.apiKey = await getAPIKeyForSyntheticsService({ server: this.server, request });
      } catch (err) {
        throw err;
      }
    }

    if (!this.apiKey) {
      const error = new APIKeyMissingError();
      this.logger.error(error);
      throw error;
    }

    return {
      hosts: this.esHosts,
      api_key: `${this.apiKey.id}:${this.apiKey.apiKey}`,
    };
  }

  async pushConfigs(request?: KibanaRequest, configs?: MonitorConfigs) {
    const monitors = this.formatConfigs(configs || (await this.getMonitorConfigs()));
    const data = {
      monitors,
      output: await this.getOutput(request),
    };

    try {
      return await this.apiClient.post(data);
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async deleteConfigs(request: KibanaRequest, configs: MonitorConfigs) {
    const data = {
      monitors: configs,
      output: await this.getOutput(request),
    };
    return await this.apiClient.delete(data);
  }

  async getMonitorConfigs() {
    const savedObjectsClient = this.server.savedObjectsClient;
    const monitorsSavedObjects = await savedObjectsClient?.find<
      SyntheticsMonitorSavedObject['attributes']
    >({
      type: syntheticsMonitorType,
    });

    const savedObjectsList = monitorsSavedObjects?.saved_objects ?? [];
    return savedObjectsList.map<ValuesType<MonitorConfigs>>(({ attributes, id }) => ({
      ...attributes,
      id,
    }));
  }

  formatConfigs(configs: MonitorConfigs) {
    // TODO: Move to dedicated formatter class
    function parseSchedule(schedule: any) {
      if (schedule?.number) {
        return `@every ${schedule.number}${schedule.unit}`;
      }
      return schedule;
    }

    function parseUrl(urls?: string | string[]) {
      if (!urls) {
        return undefined;
      }
      if (urls instanceof Array) {
        return urls;
      }
      return [urls];
    }

    function parseInlineSource(monAttrs: any) {
      if (monAttrs['source.inline.script']) {
        return {
          inline: {
            script: monAttrs['source.inline.script'],
          },
        };
      }
    }
    return configs.map((monAttrs) => {
      const { id, schedule, type, name, locations, tags, urls } = monAttrs;
      return {
        id,
        type,
        name,
        locations,
        tags,
        source: parseInlineSource(monAttrs),
        urls: parseUrl(urls),
        schedule: parseSchedule(schedule),
      };
    });
  }
}

class APIKeyMissingError extends Error {
  constructor() {
    super();
    this.message = 'API key is needed for synthetics service.';
    this.name = 'APIKeyMissingError';
  }
}

class IndexTemplateInstallationError extends Error {
  constructor() {
    super();
    this.message = 'Failed to install synthetics index templates.';
    this.name = 'IndexTemplateInstallationError';
  }
}
