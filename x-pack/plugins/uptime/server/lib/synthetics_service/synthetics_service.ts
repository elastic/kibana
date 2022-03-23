/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { KibanaRequest, Logger } from '../../../../../../src/core/server';
import {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
  TaskInstance,
} from '../../../../task_manager/server';
import { UptimeServerSetup } from '../adapters';
import { installSyntheticsIndexTemplates } from '../../rest_api/synthetics_service/install_index_templates';
import { SyntheticsServiceApiKey } from '../../../common/runtime_types/synthetics_service_api_key';
import { getAPIKeyForSyntheticsService } from './get_api_key';
import { syntheticsMonitorType } from '../saved_objects/synthetics_monitor';
import { getEsHosts } from './get_es_hosts';
import { ServiceConfig } from '../../../common/config';
import { ServiceAPIClient } from './service_api_client';
import { formatMonitorConfig } from './formatters/format_configs';
import {
  ConfigKey,
  MonitorFields,
  ServiceLocations,
  SyntheticsMonitor,
  SyntheticsMonitorWithId,
} from '../../../common/runtime_types';
import { getServiceLocations } from './get_service_locations';
import { hydrateSavedObjects } from './hydrate_saved_object';
import { SyntheticsMonitorSavedObject } from '../../../common/types';

const SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_TYPE =
  'UPTIME:SyntheticsService:Sync-Saved-Monitor-Objects';
const SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID = 'UPTIME:SyntheticsService:sync-task';
const SYNTHETICS_SERVICE_SYNC_INTERVAL_DEFAULT = '1m';

export class SyntheticsService {
  private logger: Logger;
  private readonly server: UptimeServerSetup;
  private apiClient: ServiceAPIClient;

  private readonly config: ServiceConfig;
  private readonly esHosts: string[];

  private apiKey: SyntheticsServiceApiKey | undefined;

  public locations: ServiceLocations;

  private indexTemplateExists?: boolean;
  private indexTemplateInstalling?: boolean;

  constructor(logger: Logger, server: UptimeServerSetup, config: ServiceConfig) {
    this.logger = logger;
    this.server = server;
    this.config = config;

    this.apiClient = new ServiceAPIClient(logger, this.config, this.server.kibanaVersion);

    this.esHosts = getEsHosts({ config: this.config, cloud: server.cloud });

    this.locations = [];

    this.registerServiceLocations();
  }

  public init() {
    // TODO: Figure out fake kibana requests to handle API keys on start up
    // getAPIKeyForSyntheticsService({ server: this.server }).then((apiKey) => {
    //   if (apiKey) {
    //     this.apiKey = apiKey;
    //   }
    // });
    this.setupIndexTemplates();
  }

  private setupIndexTemplates() {
    if (this.indexTemplateExists) {
      // if already installed, don't need to reinstall
      return;
    }

    if (!this.indexTemplateInstalling) {
      installSyntheticsIndexTemplates(this.server).then(
        (result) => {
          this.indexTemplateInstalling = false;
          if (result.name === 'synthetics' && result.install_status === 'installed') {
            this.logger.info('Installed synthetics index templates');
            this.indexTemplateExists = true;
          } else if (result.name === 'synthetics' && result.install_status === 'install_failed') {
            this.logger.warn(new IndexTemplateInstallationError());
            this.indexTemplateExists = false;
          }
        },
        () => {
          this.indexTemplateInstalling = false;
          this.logger.warn(new IndexTemplateInstallationError());
        }
      );
      this.indexTemplateInstalling = true;
    }
  }

  public registerServiceLocations() {
    const service = this;
    getServiceLocations(service.server).then((result) => {
      service.locations = result.locations;
      service.apiClient.locations = result.locations;
    });
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

              service.setupIndexTemplates();
              service.registerServiceLocations();

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

  public async scheduleSyncTask(
    taskManager: TaskManagerStartContract
  ): Promise<TaskInstance | null> {
    const interval = this.config.syncInterval ?? SYNTHETICS_SERVICE_SYNC_INTERVAL_DEFAULT;

    try {
      await taskManager.removeIfExists(SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID);
      const taskInstance = await taskManager.ensureScheduled({
        id: SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID,
        taskType: SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_TYPE,
        schedule: {
          interval,
        },
        params: {},
        state: {},
        scope: ['uptime'],
      });

      this.logger?.info(
        `Task ${SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID} scheduled with interval ${taskInstance.schedule?.interval}.`
      );

      return taskInstance;
    } catch (e) {
      this.logger?.error(
        `Error running task: ${SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID}, `,
        e?.message() ?? e
      );

      return null;
    }
  }

  async getOutput() {
    try {
      this.apiKey = await getAPIKeyForSyntheticsService({ server: this.server });
    } catch (err) {
      this.logger.error(err);
      throw err;
    }

    if (!this.apiKey) {
      const error = new SyntheticsDisabledError();
      this.logger.error(error);
      throw error;
    }

    this.logger.debug('Found api key and esHosts for service.');

    return {
      hosts: this.esHosts,
      api_key: `${this.apiKey?.id}:${this.apiKey?.apiKey}`,
    };
  }

  async pushConfigs(
    configs?: Array<
      SyntheticsMonitorWithId & {
        fields_under_root?: boolean;
        fields?: { config_id: string };
      }
    >
  ) {
    const monitors = this.formatConfigs(configs || (await this.getMonitorConfigs()));
    if (monitors.length === 0) {
      this.logger.debug('No monitor found which can be pushed to service.');
      return;
    }
    const data = {
      monitors,
      output: await this.getOutput(),
    };

    this.logger.debug(`${monitors.length} monitors will be pushed to synthetics service.`);

    try {
      return await this.apiClient.post(data);
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async runOnceConfigs(
    configs?: Array<
      SyntheticsMonitorWithId & {
        fields_under_root?: boolean;
        fields?: { run_once: boolean; config_id: string };
      }
    >
  ) {
    const monitors = this.formatConfigs(configs || (await this.getMonitorConfigs()));
    if (monitors.length === 0) {
      return;
    }
    const data = {
      monitors,
      output: await this.getOutput(),
    };

    try {
      return await this.apiClient.runOnce(data);
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async triggerConfigs(
    request?: KibanaRequest,
    configs?: Array<
      SyntheticsMonitorWithId & {
        fields_under_root?: boolean;
        fields?: { config_id: string; test_run_id: string };
      }
    >
  ) {
    const monitors = this.formatConfigs(configs || (await this.getMonitorConfigs()));
    if (monitors.length === 0) {
      return;
    }
    const data = {
      monitors,
      output: await this.getOutput(),
    };

    try {
      return await this.apiClient.runOnce(data);
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async deleteConfigs(configs: SyntheticsMonitorWithId[]) {
    const data = {
      monitors: this.formatConfigs(configs),
      output: await this.getOutput(),
    };
    return await this.apiClient.delete(data);
  }

  async deleteAllConfigs() {
    const configs = await this.getMonitorConfigs();
    return await this.deleteConfigs(configs);
  }

  async getMonitorConfigs() {
    const savedObjectsClient = this.server.savedObjectsClient;

    if (!savedObjectsClient?.find) {
      return [] as SyntheticsMonitorWithId[];
    }

    const findResult = await savedObjectsClient.find<SyntheticsMonitor>({
      type: syntheticsMonitorType,
      namespaces: ['*'],
      perPage: 10000,
    });

    if (this.indexTemplateExists) {
      // without mapping, querying won't make sense
      hydrateSavedObjects({
        monitors: findResult.saved_objects as unknown as SyntheticsMonitorSavedObject[],
        server: this.server,
      });
    }

    return (findResult.saved_objects ?? []).map(({ attributes, id }) => ({
      ...attributes,
      id,
      fields_under_root: true,
      fields: { config_id: id },
    })) as SyntheticsMonitorWithId[];
  }

  formatConfigs(configs: SyntheticsMonitorWithId[]) {
    return configs.map((config: Partial<MonitorFields>) =>
      formatMonitorConfig(Object.keys(config) as ConfigKey[], config)
    );
  }
}

class SyntheticsDisabledError extends Error {
  constructor() {
    super();
    this.message =
      'Synthetics is currently disabled. API key is needed for the Synthetics service. Please contact an administrator to enable Synthetics.';
    this.name = 'SyntheticsDisabledError';
  }
}

class IndexTemplateInstallationError extends Error {
  constructor() {
    super();
    this.message = 'Failed to install synthetics index templates.';
    this.name = 'IndexTemplateInstallationError';
  }
}
