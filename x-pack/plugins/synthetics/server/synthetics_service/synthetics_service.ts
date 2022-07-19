/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { SavedObject } from '@kbn/core/server';
import { KibanaRequest, Logger } from '@kbn/core/server';
import {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
  TaskInstance,
} from '@kbn/task-manager-plugin/server';
import { sendErrorTelemetryEvents } from '../routes/telemetry/monitor_upgrade_sender';
import { MonitorSyncEvent } from '../legacy_uptime/lib/telemetry/types';
import { sendSyncTelemetryEvents } from '../routes/telemetry/monitor_upgrade_sender';
import { UptimeServerSetup } from '../legacy_uptime/lib/adapters';
import { installSyntheticsIndexTemplates } from '../routes/synthetics_service/install_index_templates';
import { SyntheticsServiceApiKey } from '../../common/runtime_types/synthetics_service_api_key';
import { getAPIKeyForSyntheticsService } from './get_api_key';
import {
  syntheticsMonitorType,
  syntheticsMonitor,
} from '../legacy_uptime/lib/saved_objects/synthetics_monitor';
import { getEsHosts } from './get_es_hosts';
import { ServiceConfig } from '../../common/config';
import { ServiceAPIClient } from './service_api_client';
import {
  formatMonitorConfig,
  formatHeartbeatRequest,
  SyntheticsConfig,
} from './formatters/format_configs';
import {
  ConfigKey,
  MonitorFields,
  ServiceLocations,
  SyntheticsMonitor,
  ThrottlingOptions,
  SyntheticsMonitorWithId,
  ServiceLocationErrors,
  SyntheticsMonitorWithSecrets,
} from '../../common/runtime_types';
import { getServiceLocations } from './get_service_locations';
import { hydrateSavedObjects } from './hydrate_saved_object';
import { DecryptedSyntheticsMonitorSavedObject } from '../../common/types';

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

  private apiKey: SyntheticsServiceApiKey | undefined;

  public locations: ServiceLocations;
  public throttling: ThrottlingOptions | undefined;

  private indexTemplateExists?: boolean;
  private indexTemplateInstalling?: boolean;

  public isAllowed: boolean;
  public signupUrl: string | null;

  public syncErrors?: ServiceLocationErrors | null = [];

  constructor(logger: Logger, server: UptimeServerSetup, config: ServiceConfig) {
    this.logger = logger;
    this.server = server;
    this.config = config;
    this.isAllowed = false;
    this.signupUrl = null;

    this.apiClient = new ServiceAPIClient(logger, this.config, this.server);

    this.esHosts = getEsHosts({ config: this.config, cloud: server.cloud });

    this.locations = [];
  }

  public async init() {
    await this.registerServiceLocations();

    const { allowed, signupUrl } = await this.apiClient.checkAccountAccessStatus();
    this.isAllowed = allowed;
    this.signupUrl = signupUrl;
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
              try {
                await service.registerServiceLocations();

                const { allowed, signupUrl } = await service.apiClient.checkAccountAccessStatus();
                service.isAllowed = allowed;
                service.signupUrl = signupUrl;

                if (service.isAllowed) {
                  service.setupIndexTemplates();
                  service.syncErrors = await service.pushConfigs();
                }
              } catch (e) {
                sendErrorTelemetryEvents(service.logger, service.server.telemetry, {
                  reason: 'Failed to run scheduled sync task',
                  message: e?.message,
                  type: 'runTaskError',
                  code: e?.code,
                  status: e.status,
                  kibanaVersion: service.server.kibanaVersion,
                });
                throw e;
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
        kibanaVersion: this.server.kibanaVersion,
      });

      this.logger?.error(
        `Error running task: ${SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID}, `,
        e?.message ?? e
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

  async addConfig(config: SyntheticsConfig) {
    const monitors = this.formatConfigs([config]);

    this.apiKey = await this.getApiKey();

    if (!this.apiKey) {
      return null;
    }

    const data = {
      monitors,
      output: await this.getOutput(this.apiKey),
    };

    this.logger.debug(`1 monitor will be pushed to synthetics service.`);

    try {
      this.syncErrors = await this.apiClient.post(data);
      return this.syncErrors;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async pushConfigs(configs?: SyntheticsConfig[], isEdit?: boolean) {
    const monitorConfigs = configs ?? (await this.getMonitorConfigs());
    const monitors = this.formatConfigs(monitorConfigs);

    if (monitors.length === 0) {
      this.logger.debug('No monitor found which can be pushed to service.');
      return null;
    }

    if (!configs && monitorConfigs.length > 0) {
      const telemetry = this.getSyncTelemetry(monitorConfigs);
      sendSyncTelemetryEvents(this.logger, this.server.telemetry, telemetry);
    }

    this.apiKey = await this.getApiKey();

    if (!this.apiKey) {
      return null;
    }

    const data = {
      monitors,
      output: await this.getOutput(this.apiKey),
      isEdit: !!isEdit,
    };

    this.logger.debug(`${monitors.length} monitors will be pushed to synthetics service.`);

    try {
      this.syncErrors = await this.apiClient.put(data);
      return this.syncErrors;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async runOnceConfigs(configs?: SyntheticsConfig[]) {
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

  async triggerConfigs(request?: KibanaRequest, configs?: SyntheticsConfig[]) {
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
    const result = await this.apiClient.delete(data);
    if (this.syncErrors && this.syncErrors?.length > 0) {
      this.syncErrors = await this.pushConfigs();
    }
    return result;
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
          monitor.id,
          {
            namespace: monitor.namespaces?.[0],
          }
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

    return (monitors ?? []).map((monitor) => {
      const attributes = monitor.attributes as unknown as MonitorFields;
      return formatHeartbeatRequest({
        monitor: normalizeSecrets(monitor).attributes,
        monitorId: monitor.id,
        customHeartbeatId: attributes[ConfigKey.CUSTOM_HEARTBEAT_ID],
      });
    });
  }

  formatConfigs(configs: SyntheticsMonitorWithId[]) {
    return configs.map((config: SyntheticsMonitor) =>
      formatMonitorConfig(Object.keys(config) as ConfigKey[], config as Partial<MonitorFields>)
    );
  }

  getSyncTelemetry(monitors: SyntheticsMonitorWithId[]): MonitorSyncEvent {
    let totalRuns = 0;
    let browserTestRuns = 0;
    let httpTestRuns = 0;
    let icmpTestRuns = 0;
    let tcpTestRuns = 0;

    const locationRuns: Record<string, number> = {};
    const locationMonitors: Record<string, number> = {};

    const testRunsInDay = (schedule: string) => {
      return (24 * 60) / Number(schedule);
    };

    const monitorsByType: Record<string, number> = {
      browser: 0,
      http: 0,
      tcp: 0,
      icmp: 0,
    };

    monitors.forEach((monitor) => {
      if (monitor.schedule.number) {
        totalRuns += testRunsInDay(monitor.schedule.number);
      }
      switch (monitor.type) {
        case 'browser':
          browserTestRuns += testRunsInDay(monitor.schedule.number);
          break;
        case 'http':
          httpTestRuns += testRunsInDay(monitor.schedule.number);
          break;
        case 'icmp':
          icmpTestRuns += testRunsInDay(monitor.schedule.number);
          break;
        case 'tcp':
          tcpTestRuns += testRunsInDay(monitor.schedule.number);
          break;
        default:
          break;
      }

      monitorsByType[monitor.type] = (monitorsByType[monitor.type] ?? 0) + 1;

      monitor.locations.forEach(({ id }) => {
        locationRuns[id + 'Tests'] =
          (locationRuns[id + 'Tests'] ?? 0) + testRunsInDay(monitor.schedule.number);
        locationMonitors[id + 'Monitors'] = (locationMonitors[id + 'Monitors'] ?? 0) + 1;
      });
    });

    return {
      total: monitors.length,
      totalTests: totalRuns,
      browserTests24h: browserTestRuns,
      httpTests24h: httpTestRuns,
      icmpTests24h: icmpTestRuns,
      tcpTests24h: tcpTestRuns,
      ...locationRuns,
      ...locationMonitors,
      ...monitorsByType,
    };
  }
}

class IndexTemplateInstallationError extends Error {
  constructor() {
    super();
    this.message = 'Failed to install synthetics index templates.';
    this.name = 'IndexTemplateInstallationError';
  }
}
