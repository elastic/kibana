/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PluginInitializerContext,
  CoreStart,
  CoreSetup,
  Plugin as PluginType,
  ISavedObjectsRepository,
  Logger,
} from '../../../../src/core/server';
import { uptimeRuleFieldMap } from '../common/rules/uptime_rule_field_map';
import { initServerWithKibana, initSyntheticsServiceServerWithKibana } from './kibana.index';
import {
  KibanaTelemetryAdapter,
  UptimeCorePluginsSetup,
  UptimeCorePluginsStart,
} from './lib/adapters';
import {
  savedObjectsAdapter,
  umDynamicSettings,
  uptimeMonitor,
  syntheticsServiceApiKey,
} from './lib/saved_objects';
import { syncSyntheticsConfig } from './lib/synthetics_service/config';
import { mappingFromFieldMap } from '../../rule_registry/common/mapping_from_field_map';
import { Dataset } from '../../rule_registry/server';
import { UptimeConfig } from './config';
import { UptimeRouter } from './types';

import { ConcreteTaskInstance } from '../../task_manager/server';
import type { CloudSetup } from '../../cloud/server';

export type UptimeRuleRegistry = ReturnType<Plugin['setup']>['ruleRegistry'];

export class Plugin implements PluginType {
  private savedObjectsClient?: ISavedObjectsRepository;
  private initContext: PluginInitializerContext;
  private logger?: Logger;
  private router?: UptimeRouter;
  private cloud?: CloudSetup;

  constructor(_initializerContext: PluginInitializerContext) {
    this.initContext = _initializerContext;
  }

  public setup(core: CoreSetup<UptimeCorePluginsStart>, plugins: UptimeCorePluginsSetup) {
    const config = this.initContext.config.get<UptimeConfig>();

    this.cloud = plugins.cloud;

    savedObjectsAdapter.config = config;

    this.logger = this.initContext.logger.get();
    this.router = core.http.createRouter();
    const { ruleDataService } = plugins.ruleRegistry;

    const ruleDataClient = ruleDataService.initializeIndex({
      feature: 'uptime',
      registrationContext: 'observability.uptime',
      dataset: Dataset.alerts,
      componentTemplateRefs: [],
      componentTemplates: [
        {
          name: 'mappings',
          mappings: mappingFromFieldMap(uptimeRuleFieldMap, 'strict'),
        },
      ],
    });

    initServerWithKibana(
      { router: this.router, cloud: this.cloud, config },
      plugins,
      ruleDataClient,
      this.logger,
      config
    );
    const self = this;
    core.getStartServices().then(([, startPlugins]) => {
      initSyntheticsServiceServerWithKibana(
        {
          router: self.router!,
          cloud: this.cloud,
          security: startPlugins.security,
          fleet: startPlugins.fleet,
          config,
        },
        startPlugins,
        config
      );
    });
    core.savedObjects.registerType(umDynamicSettings);
    core.savedObjects.registerType(uptimeMonitor);
    core.savedObjects.registerType(syntheticsServiceApiKey);
    KibanaTelemetryAdapter.registerUsageCollector(
      plugins.usageCollection,
      () => this.savedObjectsClient
    );

    plugins.taskManager.registerTaskDefinitions({
      // syntheticsService:sync is the task type, and must be unique across the entire system
      'syntheticsService:sync': {
        // Human friendly name, used to represent this task in logs, UI, etc
        title: 'Human friendly name',

        // Optional, human-friendly, more detailed description
        description: 'Amazing!!',

        // Optional, how long, in minutes or seconds, the system should wait before
        // a running instance of this task is considered to be timed out.
        // This defaults to 5 minutes.
        timeout: '1m',

        // Optional, how many attempts before marking task as failed.
        // This defaults to what is configured at the task manager level.
        maxAttempts: 1,

        // The maximum number tasks of this type that can be run concurrently per Kibana instance.
        // Setting this value will force Task Manager to poll for this task type seperatly from other task types which
        // can add significant load to the ES cluster, so please use this configuration only when absolutly necesery.
        maxConcurrency: 1,

        // The createTaskRunner function / method returns an object that is responsible for
        // performing the work of the task. context: { taskInstance }, is documented below.
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            // Perform the work of the task. The return value should fit the TaskResult interface, documented
            // below. Invalid return values will result in a logged warning.
            async run() {
              const { params, state, id } = taskInstance;
              const prevState = state || { count: 0 };

              const [coreStart] = await core.getStartServices();
              await syncSyntheticsConfig({
                config,
                core: coreStart,
                cloud: plugins.cloud,
                savedObjectsClient: coreStart.savedObjects.createInternalRepository([
                  syntheticsServiceApiKey.name,
                ]),
              });
              console.log(
                'RUNNINGNNNNN SYNTHETIC TASK MANAGER   ' + new Date(Date.now()).toISOString()
              );
              return { state };
            },

            // Optional, will be called if a running instance of this task times out, allowing the task
            // to attempt to clean itself up.
            async cancel() {
              // Do whatever is required to cancel this task, such as killing any spawned processes
            },
          };
        },
      },
    });

    return {
      ruleRegistry: ruleDataClient,
    };
  }

  public start(core: CoreStart, plugins: UptimeCorePluginsStart) {
    this.savedObjectsClient = core.savedObjects.createInternalRepository();

    plugins.taskManager
      .ensureScheduled({
        id: 'syntheticsService:sync-task-id',
        taskType: `syntheticsService:sync`,
        schedule: {
          interval: '5m',
        },
        params: {},
        state: {},
        scope: ['uptime'],
      })
      .then((result) => console.warn(result))
      .catch((e) => console.warn(e));
  }

  public stop() {}
}
