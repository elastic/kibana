/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { Logger, SavedObject, ElasticsearchClient } from '@kbn/core/server';
import {
  ConcreteTaskInstance,
  TaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { Subject } from 'rxjs';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import pMap from 'p-map';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { syntheticsMonitorType, syntheticsParamType } from '../../common/types/saved_objects';
import { sendErrorTelemetryEvents } from '../routes/telemetry/monitor_upgrade_sender';
import { UptimeServerSetup } from '../legacy_uptime/lib/adapters';
import { installSyntheticsIndexTemplates } from '../routes/synthetics_service/install_index_templates';
import { getAPIKeyForSyntheticsService } from './get_api_key';
import { getEsHosts } from './get_es_hosts';
import { ServiceConfig } from '../../common/config';
import { ServiceAPIClient, ServiceData } from './service_api_client';
import {
  ConfigData,
  formatHeartbeatRequest,
  formatMonitorConfigFields,
  mixParamsWithGlobalParams,
} from './formatters/format_configs';
import {
  ConfigKey,
  EncryptedSyntheticsMonitor,
  MonitorFields,
  ServiceLocationErrors,
  ServiceLocations,
  SyntheticsMonitorWithId,
  SyntheticsMonitorWithSecrets,
  SyntheticsParamSO,
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
  private esClient?: ElasticsearchClient;
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
    if (process.env.CI && !this.config?.manifestUrl) {
      // skip installation on CI
      return;
    }
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
    const interval = this.config.syncInterval ?? SYNTHETICS_SERVICE_SYNC_INTERVAL_DEFAULT;

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

                if (service.isAllowed && service.config.manifestUrl) {
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

              return { state, schedule: { interval } };
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

  private async getLicense() {
    this.esClient = this.getESClient();
    let license;
    if (this.esClient === undefined || this.esClient === null) {
      throw Error(
        'Cannot sync monitors with the Synthetics service. Elasticsearch client is unavailable: cannot retrieve license information'
      );
    }
    try {
      license = (await this.esClient.license.get())?.license;
    } catch (e) {
      throw new Error(
        `Cannot sync monitors with the Synthetics service. Unable to determine license level: ${e}`
      );
    }

    if (license?.status === 'expired') {
      throw new Error('Cannot sync monitors with the Synthetics service. License is expired.');
    }

    if (!license?.type) {
      throw new Error(
        'Cannot sync monitors with the Synthetics service. Unable to determine license level.'
      );
    }

    return license;
  }

  private getESClient() {
    if (!this.server.coreStart) {
      return;
    }
    return this.server.coreStart?.elasticsearch.client.asInternalUser;
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

  async addConfigs(configs: ConfigData[]) {
    try {
      if (configs.length === 0) {
        return;
      }

      const monitors = this.formatConfigs(configs);
      const license = await this.getLicense();

      const output = await this.getOutput();
      if (output) {
        this.logger.debug(`1 monitor will be pushed to synthetics service.`);

        this.syncErrors = await this.apiClient.post({
          monitors,
          output,
          license,
        });
      }
      return this.syncErrors;
    } catch (e) {
      this.logger.error(e);
    }
  }

  async editConfig(monitorConfig: ConfigData[], isEdit = true) {
    try {
      if (monitorConfig.length === 0) {
        return;
      }
      const license = await this.getLicense();
      const monitors = this.formatConfigs(monitorConfig);

      const output = await this.getOutput();
      if (output) {
        const data = {
          monitors,
          output,
          isEdit,
          license,
        };

        this.syncErrors = await this.apiClient.put(data);
      }
      return this.syncErrors;
    } catch (e) {
      this.logger.error(e);
    }
  }

  async pushConfigs() {
    const license = await this.getLicense();
    const service = this;
    const subject = new Subject<MonitorFields[]>();

    let output: ServiceData['output'] | null = null;

    subject.subscribe(async (monitors) => {
      try {
        if (monitors.length === 0 || !this.config.manifestUrl) {
          return;
        }

        if (!output) {
          output = await this.getOutput();

          if (!output) {
            sendErrorTelemetryEvents(service.logger, service.server.telemetry, {
              reason: 'API key is not valid.',
              message: 'Failed to push configs. API key is not valid.',
              type: 'invalidApiKey',
              stackVersion: service.server.stackVersion,
            });
            return;
          }
        }

        this.logger.debug(`${monitors.length} monitors will be pushed to synthetics service.`);

        service.syncErrors = await this.apiClient.syncMonitors({
          monitors,
          output,
          license,
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

  async runOnceConfigs(configs: ConfigData) {
    const license = await this.getLicense();
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
        license,
      });
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async deleteConfigs(configs: ConfigData[]) {
    try {
      if (configs.length === 0) {
        return;
      }
      const license = await this.getLicense();
      const hasPublicLocations = configs.some((config) =>
        config.monitor.locations.some(({ isServiceManaged }) => isServiceManaged)
      );

      if (hasPublicLocations) {
        const output = await this.getOutput();
        if (!output) {
          return;
        }

        const data = {
          output,
          monitors: this.formatConfigs(configs),
          license,
        };
        return await this.apiClient.delete(data);
      }
    } catch (e) {
      this.server.logger.error(e);
    }
  }

  async deleteAllConfigs() {
    const license = await this.getLicense();
    const subject = new Subject<MonitorFields[]>();

    subject.subscribe(async (monitors) => {
      const hasPublicLocations = monitors.some((config) =>
        config.locations.some(({ isServiceManaged }) => isServiceManaged)
      );

      if (hasPublicLocations) {
        const output = await this.getOutput();
        if (!output) {
          return;
        }

        const data = {
          output,
          monitors,
          license,
        };
        return await this.apiClient.delete(data);
      }
    });

    await this.getMonitorConfigs(subject);
  }

  async getMonitorConfigs(subject: Subject<MonitorFields[]>) {
    const soClient = this.server.savedObjectsClient;
    const encryptedClient = this.server.encryptedSavedObjects.getClient();

    if (!soClient?.find) {
      return [] as SyntheticsMonitorWithId[];
    }

    const paramsBySpace = await this.getSyntheticsParams();

    const finder = soClient.createPointInTimeFinder<EncryptedSyntheticsMonitor>({
      type: syntheticsMonitorType,
      perPage: 100,
      namespaces: [ALL_SPACES_ID],
    });

    for await (const result of finder.find()) {
      const monitors = await this.decryptMonitors(result.saved_objects, encryptedClient);

      const configDataList: ConfigData[] = (monitors ?? []).map((monitor) => {
        const attributes = monitor.attributes as unknown as MonitorFields;
        const monitorSpace = monitor.namespaces?.[0] ?? DEFAULT_SPACE_ID;

        const params = paramsBySpace[monitorSpace];

        return {
          params: { ...params, ...(paramsBySpace?.[ALL_SPACES_ID] ?? {}) },
          monitor: normalizeSecrets(monitor).attributes,
          configId: monitor.id,
          heartbeatId: attributes[ConfigKey.MONITOR_QUERY_ID],
        };
      });

      const formattedConfigs = this.formatConfigs(configDataList);

      subject.next(formattedConfigs as MonitorFields[]);
    }

    await finder.close();
  }

  async decryptMonitors(
    monitors: Array<SavedObject<EncryptedSyntheticsMonitor>>,
    encryptedClient: EncryptedSavedObjectsClient
  ) {
    const start = performance.now();

    const decryptedMonitors = await pMap(
      monitors,
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
    );

    const end = performance.now();
    const duration = end - start;

    this.logger.debug(`Decrypted ${monitors.length} monitors. Took ${duration} milliseconds`, {
      event: {
        duration,
      },
      monitors: monitors.length,
    });

    return decryptedMonitors.filter((monitor) => monitor !== null) as Array<
      SavedObject<SyntheticsMonitorWithSecrets>
    >;
  }

  async getSyntheticsParams({ spaceId }: { spaceId?: string } = {}) {
    const encryptedClient = this.server.encryptedSavedObjects.getClient();

    const paramsBySpace: Record<string, Record<string, string>> = Object.create(null);

    const finder =
      await encryptedClient.createPointInTimeFinderDecryptedAsInternalUser<SyntheticsParamSO>({
        type: syntheticsParamType,
        perPage: 1000,
        namespaces: spaceId ? [spaceId] : undefined,
      });

    for await (const response of finder.find()) {
      response.saved_objects.forEach((param) => {
        param.namespaces?.forEach((namespace) => {
          if (!paramsBySpace[namespace]) {
            paramsBySpace[namespace] = Object.create(null);
          }
          paramsBySpace[namespace][param.attributes.key] = param.attributes.value;
        });
      });
    }

    // no need to wait here
    finder.close();

    if (paramsBySpace[ALL_SPACES_ID]) {
      Object.keys(paramsBySpace).forEach((space) => {
        if (space !== ALL_SPACES_ID) {
          paramsBySpace[space] = Object.assign(paramsBySpace[ALL_SPACES_ID], paramsBySpace[space]);
        }
      });
      if (spaceId) {
        paramsBySpace[spaceId] = {
          ...(paramsBySpace?.[spaceId] ?? {}),
          ...(paramsBySpace?.[ALL_SPACES_ID] ?? {}),
        };
      }
    }

    return paramsBySpace;
  }

  formatConfigs(configData: ConfigData[] | ConfigData) {
    const configDataList = Array.isArray(configData) ? configData : [configData];

    return configDataList.map((config) => {
      const { str: paramsString, params } = mixParamsWithGlobalParams(
        config.params,
        config.monitor
      );

      const asHeartbeatConfig = formatHeartbeatRequest(config, paramsString);

      return formatMonitorConfigFields(
        Object.keys(asHeartbeatConfig) as ConfigKey[],
        asHeartbeatConfig as Partial<MonitorFields>,
        this.logger,
        params ?? {}
      );
    });
  }
}

class IndexTemplateInstallationError extends Error {
  constructor() {
    super();
    this.message = 'Failed to install synthetics index templates.';
    this.name = 'IndexTemplateInstallationError';
  }
}
