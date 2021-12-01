/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import axios from 'axios';
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

const SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_TYPE =
  'UPTIME:SyntheticsService:Sync-Saved-Monitor-Objects';
const SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID = 'UPTIME:SyntheticsService:sync-task';

export class SyntheticsService {
  private logger: Logger;
  private readonly server: UptimeServerSetup;

  private readonly config: UptimeConfig;
  private readonly esHosts: string[];

  private apiKey: SyntheticsServiceApiKey | undefined;

  constructor(logger: Logger, server: UptimeServerSetup) {
    this.logger = logger;
    this.server = server;
    this.config = server.config;

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

              // TODO: Push API Key and Monitor Configs to service here

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
          interval: '5m',
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

  async pushConfigs(request: KibanaRequest) {
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

    const monitors = await this.getMonitorConfigs();
    const data = {
      monitors,
      output: {
        hosts: this.esHosts,
        api_key: `${this.apiKey.id}:${this.apiKey.apiKey}`,
      },
    };

    const { url, username, password } = this.config.unsafe.service;

    try {
      await axios({
        method: 'POST',
        url: url + '/monitors',
        data,
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
        },
      });
    } catch (e) {
      this.logger.error(e);
    }
  }

  async getMonitorConfigs() {
    const savedObjectsClient = this.server.savedObjectsClient;
    const monitorsSavedObjects = await savedObjectsClient.find<SyntheticsMonitorSavedObject>({
      type: syntheticsMonitorType,
    });

    const savedObjectsList = monitorsSavedObjects.saved_objects;
    return savedObjectsList.map(({ attributes, id }) => ({
      ...attributes,
      id,
    }));
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
