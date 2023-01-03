/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { Logger, SavedObject } from '@kbn/core/server';
import {
  ConcreteTaskInstance,
  TaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { Subject } from 'rxjs';
import { syntheticsParamType } from '../../common/types/saved_objects';
import { sendErrorTelemetryEvents } from '../routes/telemetry/monitor_upgrade_sender';
import { UptimeServerSetup } from '../legacy_uptime/lib/adapters';
import { installSyntheticsIndexTemplates } from '../routes/synthetics_service/install_index_templates';
import { getAPIKeyForSyntheticsService } from './get_api_key';
import { syntheticsMonitorType } from '../legacy_uptime/lib/saved_objects/synthetics_monitor';
import { getEsHosts } from './get_es_hosts';
import { ServiceConfig } from '../../common/config';
import { ServiceAPIClient } from './service_api_client';
import { formatHeartbeatRequest, formatMonitorConfig } from './formatters/format_configs';
import {
  ConfigKey,
  HeartbeatConfig,
  MonitorFields,
  ServiceLocationErrors,
  ServiceLocations,
  SyntheticsMonitor,
  SyntheticsMonitorWithId,
  SyntheticsMonitorWithSecrets,
  SyntheticsParam,
  ThrottlingOptions,
} from '../../common/runtime_types';
import { getServiceLocations } from './get_service_locations';

import { normalizeSecrets } from './utils/secrets';

const SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_TYPE =
  'UPTIME:SyntheticsService:Sync-Saved-Monitor-Objects';
const SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID = 'UPTIME:SyntheticsService:sync-task';
const SYNTHETICS_SERVICE_SYNC_INTERVAL_DEFAULT = '5m';

export class SyntheticsService {
  private logger: Logger;
  private readonly server: UptimeServerSetup;
  public apiClient: ServiceAPIClient;

  private readonly config: ServiceConfig;
  private readonly esHosts: string[];

  public locations: ServiceLocations;
  public throttling: ThrottlingOptions | undefined;

  public indexTemplateExists?: boolean;
  private indexTemplateInstalling?: boolean;

  public isAllowed: boolean;
  public signupUrl: string | null;

  public syncErrors?: ServiceLocationErrors | null = [];

  public invalidApiKeyError?: boolean;

  constructor(server: UptimeServerSetup) {
    this.logger = server.logger;
    this.server = server;
    this.config = server.config.service ?? {};
    this.isAllowed = false;
    this.signupUrl = null;

    this.apiClient = new ServiceAPIClient(server.logger, this.config, this.server);

    this.esHosts = getEsHosts({ config: this.config, cloud: server.cloud });

    this.locations = [];
  }

  public async setup(taskManager: TaskManagerSetupContract) {
    this.registerSyncTask(taskManager);

    await this.registerServiceLocations();

    const { allowed, signupUrl } = await this.apiClient.checkAccountAccessStatus();
    this.isAllowed = allowed;
    this.signupUrl = signupUrl;
  }

  public start(taskManager: TaskManagerStartContract) {
    if (this.config?.manifestUrl) {
      this.scheduleSyncTask(taskManager);
    }
    this.setupIndexTemplates();
  }

  public async setupIndexTemplates() {
    if (this.indexTemplateExists) {
      // if already installed, don't need to reinstall
      return;
    }
    try {
      if (!this.indexTemplateInstalling) {
        this.indexTemplateInstalling = true;

        const installedPackage = await installSyntheticsIndexTemplates(this.server);
        this.indexTemplateInstalling = false;
        if (
          installedPackage.name === 'synthetics' &&
          installedPackage.install_status === 'installed'
        ) {
          this.logger.info('Installed synthetics index templates');
          this.indexTemplateExists = true;
        } else if (
          installedPackage.name === 'synthetics' &&
          installedPackage.install_status === 'install_failed'
        ) {
          this.logger.warn(new IndexTemplateInstallationError());
          this.indexTemplateExists = false;
        }
      }
    } catch (e) {
      this.logger.error(e);
      this.indexTemplateInstalling = false;
      this.logger.warn(new IndexTemplateInstallationError());
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

        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            // Perform the work of the task. The return value should fit the TaskResult interface.
            async run() {
              const { state } = taskInstance;
              try {
                await service.registerServiceLocations();

                const { allowed, signupUrl } = await service.apiClient.checkAccountAccessStatus();
                service.isAllowed = allowed;
                service.signupUrl = signupUrl;

                if (service.isAllowed) {
                  service.setupIndexTemplates();
                  await service.pushConfigs();
                }
              } catch (e) {
                sendErrorTelemetryEvents(service.logger, service.server.telemetry, {
                  reason: 'Failed to run scheduled sync task',
                  message: e?.message,
                  type: 'runTaskError',
                  code: e?.code,
                  status: e.status,
                  stackVersion: service.server.stackVersion,
                });
                service.logger.error(e);
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
      sendErrorTelemetryEvents(this.logger, this.server.telemetry, {
        reason: 'Failed to schedule sync task',
        message: e?.message ?? e,
        type: 'scheduleTaskError',
        code: e?.code,
        status: e.status,
        stackVersion: this.server.stackVersion,
      });

      this.logger?.error(
        `Error running task: ${SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID}, `,
        e?.message ?? e
      );

      return null;
    }
  }

  async getOutput() {
    const { apiKey, isValid } = await getAPIKeyForSyntheticsService({ server: this.server });
    if (!isValid) {
      this.server.logger.error(
        'API key is not valid. Cannot push monitor configuration to synthetics public testing locations'
      );
      this.invalidApiKeyError = true;
      return null;
    }

    return {
      hosts: this.esHosts,
      api_key: `${apiKey?.id}:${apiKey?.apiKey}`,
    };
  }

  async addConfig(config: HeartbeatConfig | HeartbeatConfig[]) {
    try {
      const monitors = this.formatConfigs(Array.isArray(config) ? config : [config]);

      const output = await this.getOutput();
      if (output) {
        this.logger.debug(`1 monitor will be pushed to synthetics service.`);

        this.syncErrors = await this.apiClient.post({
          monitors,
          output,
        });
      }
      return this.syncErrors;
    } catch (e) {
      this.logger.error(e);
    }
  }

  async editConfig(monitorConfig: HeartbeatConfig | HeartbeatConfig[], isEdit = true) {
    try {
      const monitors = this.formatConfigs(
        Array.isArray(monitorConfig) ? monitorConfig : [monitorConfig]
      );

      const output = await this.getOutput();
      if (output) {
        const data = {
          monitors,
          output,
          isEdit,
        };

        this.syncErrors = await this.apiClient.put(data);
      }
      return this.syncErrors;
    } catch (e) {
      this.logger.error(e);
    }
  }

  async pushConfigs() {
    const service = this;
    const subject = new Subject<SyntheticsMonitorWithId[]>();

    subject.subscribe(async (monitorConfigs) => {
      try {
        const monitors = this.formatConfigs(monitorConfigs);

        if (monitors.length === 0) {
          this.logger.debug('No monitor found which can be pushed to service.');
          return null;
        }

        const output = await this.getOutput();

        if (!output) {
          sendErrorTelemetryEvents(service.logger, service.server.telemetry, {
            reason: 'API key is not valid.',
            message: 'Failed to push configs. API key is not valid.',
            type: 'invalidApiKey',
            stackVersion: service.server.stackVersion,
          });
          return;
        }

        this.logger.debug(`${monitors.length} monitors will be pushed to synthetics service.`);

        service.syncErrors = await this.apiClient.put({
          monitors,
          output,
        });
      } catch (e) {
        sendErrorTelemetryEvents(service.logger, service.server.telemetry, {
          reason: 'Failed to push configs to service',
          message: e?.message,
          type: 'pushConfigsError',
          code: e?.code,
          status: e.status,
          stackVersion: service.server.stackVersion,
        });
        this.logger.error(e);
      }
    });

    await this.getMonitorConfigs(subject);
  }

  async runOnceConfigs(configs: HeartbeatConfig[]) {
    const monitors = this.formatConfigs(configs);
    if (monitors.length === 0) {
      return;
    }

    const output = await this.getOutput();
    if (!output) {
      return;
    }

    try {
      return await this.apiClient.runOnce({
        monitors,
        output,
      });
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async deleteConfigs(configs: SyntheticsMonitorWithId[]) {
    const hasPublicLocations = configs.some(({ locations }) =>
      locations.some(({ isServiceManaged }) => isServiceManaged)
    );

    if (hasPublicLocations) {
      const output = await this.getOutput();
      if (!output) {
        return;
      }

      const data = {
        output,
        monitors: this.formatConfigs(configs),
      };
      return await this.apiClient.delete(data);
    }
  }

  async deleteAllConfigs() {
    const subject = new Subject<SyntheticsMonitorWithId[]>();

    subject.subscribe(async (monitors) => {
      await this.deleteConfigs(monitors);
    });

    await this.getMonitorConfigs(subject);
  }

  async getMonitorConfigs(subject: Subject<SyntheticsMonitorWithId[]>) {
    const soClient = this.server.savedObjectsClient;
    const encryptedClient = this.server.encryptedSavedObjects.getClient();

    if (!soClient?.find) {
      return [] as SyntheticsMonitorWithId[];
    }

    const paramsBySpace = await this.getSyntheticsParams();

    const finder = soClient.createPointInTimeFinder({
      type: syntheticsMonitorType,
      perPage: 500,
      namespaces: ['*'],
    });

    const start = performance.now();

    for await (const result of finder.find()) {
      const encryptedMonitors = result.saved_objects;

      const monitors: Array<SavedObject<SyntheticsMonitorWithSecrets>> = (
        await Promise.all(
          encryptedMonitors.map(
            (monitor) =>
              new Promise((resolve) => {
                encryptedClient
                  .getDecryptedAsInternalUser<SyntheticsMonitorWithSecrets>(
                    syntheticsMonitorType,
                    monitor.id,
                    {
                      namespace: monitor.namespaces?.[0],
                    }
                  )
                  .then((decryptedMonitor) => resolve(decryptedMonitor))
                  .catch((e) => {
                    this.logger.error(e);
                    sendErrorTelemetryEvents(this.logger, this.server.telemetry, {
                      reason: 'Failed to decrypt monitor',
                      message: e?.message,
                      type: 'runTaskError',
                      code: e?.code,
                      status: e.status,
                      stackVersion: this.server.stackVersion,
                    });
                    resolve(null);
                  });
              })
          )
        )
      ).filter((monitor) => monitor !== null) as Array<SavedObject<SyntheticsMonitorWithSecrets>>;

      const end = performance.now();
      const duration = end - start;

      this.logger.debug(`Decrypted ${monitors.length} monitors. Took ${duration} milliseconds`, {
        event: {
          duration,
        },
        monitors: monitors.length,
      });

      subject.next(
        (monitors ?? []).map((monitor) => {
          const attributes = monitor.attributes as unknown as MonitorFields;
          return formatHeartbeatRequest({
            monitor: normalizeSecrets(monitor).attributes,
            monitorId: monitor.id,
            heartbeatId: attributes[ConfigKey.MONITOR_QUERY_ID],
            params: monitor.namespaces
              ? paramsBySpace[monitor.namespaces[0]]
              : paramsBySpace.default,
          });
        })
      );
    }
  }
  async getSyntheticsParams({ spaceId }: { spaceId?: string } = {}) {
    const encryptedClient = this.server.encryptedSavedObjects.getClient();

    const paramsBySpace: Record<string, Record<string, string>> = {};

    const finder =
      await encryptedClient.createPointInTimeFinderDecryptedAsInternalUser<SyntheticsParam>({
        type: syntheticsParamType,
        perPage: 1000,
        namespaces: spaceId ? [spaceId] : undefined,
      });

    for await (const response of finder.find()) {
      response.saved_objects.forEach((param) => {
        param.namespaces?.forEach((namespace) => {
          if (!paramsBySpace[namespace]) {
            paramsBySpace[namespace] = {};
          }
          paramsBySpace[namespace][param.attributes.key] = param.attributes.value;
        });
      });
    }

    // no need to wait here
    finder.close();

    return paramsBySpace;
  }

  formatConfigs(configs: SyntheticsMonitorWithId[]) {
    return configs.map((config: SyntheticsMonitor) =>
      formatMonitorConfig(Object.keys(config) as ConfigKey[], config as Partial<MonitorFields>)
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
