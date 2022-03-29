/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { SavedObject } from 'kibana/server';
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
import { syntheticsMonitorType, syntheticsMonitor } from '../saved_objects/synthetics_monitor';
import { getEsHosts } from './get_es_hosts';
import { ServiceConfig } from '../../../common/config';
import { ServiceAPIClient } from './service_api_client';
import { formatMonitorConfig } from './formatters/format_configs';
import {
  ConfigKey,
  MonitorFields,
  ServiceLocations,
  SyntheticsMonitor,
  ThrottlingOptions,
  SyntheticsMonitorWithId,
  ServiceLocationErrors,
  SyntheticsMonitorWithSecrets,
} from '../../../common/runtime_types';
import { getServiceLocations } from './get_service_locations';
import { hydrateSavedObjects } from './hydrate_saved_object';
import { DecryptedSyntheticsMonitorSavedObject } from '../../../common/types';

import { normalizeSecrets } from './utils/secrets';

const SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_TYPE =
  'UPTIME:SyntheticsService:Sync-Saved-Monitor-Objects';
const SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID = 'UPTIME:SyntheticsService:sync-task';
const SYNTHETICS_SERVICE_SYNC_INTERVAL_DEFAULT = '5m';

export class SyntheticsService {
  private logger: Logger;
  private readonly server: UptimeServerSetup;
  private apiClient: ServiceAPIClient;

  private readonly config: ServiceConfig;
  private readonly esHosts: string[];

  private apiKey: SyntheticsServiceApiKey | undefined;

  public locations: ServiceLocations;
  public throttling: ThrottlingOptions | undefined;

  private indexTemplateExists?: boolean;
  private indexTemplateInstalling?: boolean;

  public isAllowed: boolean;

  public syncErrors?: ServiceLocationErrors = [];

  constructor(logger: Logger, server: UptimeServerSetup, config: ServiceConfig) {
    this.logger = logger;
    this.server = server;
    this.config = config;
    this.isAllowed = false;

    this.apiClient = new ServiceAPIClient(logger, this.config, this.server.kibanaVersion);

    this.esHosts = getEsHosts({ config: this.config, cloud: server.cloud });

    this.locations = [];
  }

  public async init() {
    await this.registerServiceLocations();

    this.isAllowed = await this.apiClient.checkIfAccountAllowed();
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

  public async registerServiceLocations() {
    const service = this;

    try {
      const result = await getServiceLocations(service.server);
      service.throttling = result.throttling;
      service.locations = result.locations;
      service.apiClient.locations = result.locations;
    } catch (e) {
      this.logger.error(e);
    }
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

              await service.registerServiceLocations();

              service.isAllowed = await service.apiClient.checkIfAccountAllowed();

              if (service.isAllowed) {
                service.setupIndexTemplates();
                service.syncErrors = await service.pushConfigs();
              }

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

  async getApiKey() {
    try {
      this.apiKey = await getAPIKeyForSyntheticsService({ server: this.server });
    } catch (err) {
      this.logger.error(err);
      throw err;
    }

    return this.apiKey;
  }

  async getOutput(apiKey: SyntheticsServiceApiKey) {
    return {
      hosts: this.esHosts,
      api_key: `${apiKey?.id}:${apiKey?.apiKey}`,
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

    this.apiKey = await this.getApiKey();

    if (!this.apiKey) {
      return null;
    }

    const data = {
      monitors,
      output: await this.getOutput(this.apiKey),
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
    this.apiKey = await this.getApiKey();

    if (!this.apiKey) {
      return null;
    }

    const data = {
      monitors,
      output: await this.getOutput(this.apiKey),
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

    this.apiKey = await this.getApiKey();

    if (!this.apiKey) {
      return null;
    }

    const data = {
      monitors,
      output: await this.getOutput(this.apiKey),
    };

    try {
      return await this.apiClient.runOnce(data);
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async deleteConfigs(configs: SyntheticsMonitorWithId[]) {
    this.apiKey = await this.getApiKey();

    if (!this.apiKey) {
      return null;
    }

    const data = {
      monitors: this.formatConfigs(configs),
      output: await this.getOutput(this.apiKey),
    };
    return await this.apiClient.delete(data);
  }

  async deleteAllConfigs() {
    const configs = await this.getMonitorConfigs();
    return await this.deleteConfigs(configs);
  }

  async getMonitorConfigs() {
    const savedObjectsClient = this.server.savedObjectsClient;
    const encryptedClient = this.server.encryptedSavedObjects.getClient();

    if (!savedObjectsClient?.find) {
      return [] as SyntheticsMonitorWithId[];
    }

    const { saved_objects: encryptedMonitors } = await savedObjectsClient.find<SyntheticsMonitor>({
      type: syntheticsMonitorType,
      namespaces: ['*'],
      perPage: 10000,
    });

    const start = performance.now();

    const monitors: Array<SavedObject<SyntheticsMonitorWithSecrets>> = await Promise.all(
      encryptedMonitors.map((monitor) =>
        encryptedClient.getDecryptedAsInternalUser<SyntheticsMonitorWithSecrets>(
          syntheticsMonitor.name,
          monitor.id
        )
      )
    );

    const end = performance.now();
    const duration = end - start;

    this.logger.debug(`Decrypted ${monitors.length} monitors. Took ${duration} milliseconds`, {
      event: {
        duration,
      },
      monitors: monitors.length,
    });

    if (this.indexTemplateExists) {
      // without mapping, querying won't make sense
      hydrateSavedObjects({
        monitors: monitors as unknown as DecryptedSyntheticsMonitorSavedObject[],
        server: this.server,
      });
    }

    return (monitors ?? []).map((monitor) => ({
      ...normalizeSecrets(monitor).attributes,
      id: monitor.id,
      fields_under_root: true,
      fields: { config_id: monitor.id },
    }));
  }

  formatConfigs(configs: SyntheticsMonitorWithId[]) {
    return configs.map((config: Partial<MonitorFields>) =>
      formatMonitorConfig(Object.keys(config) as ConfigKey[], config)
    );
  }
}

class IndexTemplateInstallationError extends Error {
  constructor() {
    super();
    this.message = 'Failed to install synthetics index templates.';
    this.name = 'IndexTemplateInstallationError';
  }
}
