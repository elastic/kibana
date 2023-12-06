/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import {
  CoreStart,
  ElasticsearchClient,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
  TaskPriority,
} from '@kbn/task-manager-plugin/server';
import { Observable } from 'rxjs';
import {
  createConcreteWriteIndex,
  createOrUpdateComponentTemplate,
  createOrUpdateIndexTemplate,
  DataStreamAdapter,
  getDataStreamAdapter,
  getIndexTemplate,
  InstallShutdownError,
  installWithTimeout,
  parseDuration,
} from '..';
import type {
  ScheduleBackfillOptions,
  ScheduleBackfillResults,
} from '../application/rule/methods/backfill/schedule/types';
import { RuleDomain } from '../application/rule/types';
import { getTimeRange } from '../lib/get_time_range';
import { AlertingPluginsStart } from '../plugin';
import { TaskRunnerFactory } from '../task_runner';
import { AdHocRuleRunParams, RuleExecutionGap, RuleTypeRegistry } from '../types';

interface ConstructorOpts {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  pluginStop$: Observable<void>;
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
  taskRunnerFactory: TaskRunnerFactory;
  coreStartServices: Promise<[CoreStart, AlertingPluginsStart, unknown]>;
}

interface BulkQueueOpts {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  rules: RuleDomain[];
  spaceId: string;
  ruleTypeRegistry: RuleTypeRegistry;
  options: ScheduleBackfillOptions;
}

export class BackfillClient {
  private logger: Logger;
  private isInitializing: boolean = false;
  private initialized: boolean = false;
  private pluginStop$: Observable<void>;
  private elasticsearchClientPromise: Promise<ElasticsearchClient>;
  private taskManager?: TaskManagerStartContract;
  private initPromise: Promise<void>;
  private coreStartServices: Promise<[CoreStart, AlertingPluginsStart, unknown]>;
  private readonly backfillTaskType = 'Backfill';
  private readonly datastreamAdapter: DataStreamAdapter;

  constructor(opts: ConstructorOpts) {
    this.logger = opts.logger;
    this.pluginStop$ = opts.pluginStop$;
    this.elasticsearchClientPromise = opts.elasticsearchClientPromise;
    this.coreStartServices = opts.coreStartServices;
    this.datastreamAdapter = getDataStreamAdapter({ useDataStream: true });

    // Kick off initialization of common assets and save the promise
    this.initPromise = this.initialize().catch((err) => {
      this.initialized = false;
      this.isInitializing = false;
      this.logger.error(`Error initializing backfillclient resources - ${err.message}`);
    });

    // Registers the task that handles the backfill using the ad hoc task runner
    opts.taskManager.registerTaskDefinitions({
      [this.backfillTaskType]: {
        title: 'Alerting Backfill',
        priority: TaskPriority.Low,
        createTaskRunner: (context: RunContext) => opts.taskRunnerFactory.createAdHoc(context),
      },
    });
  }

  private async initialize(timeoutMs?: number) {
    this.isInitializing = true;
    try {
      this.logger.info(`Initializing resources for Backfill client`);
      const esClient = await this.elasticsearchClientPromise;

      await installWithTimeout({
        installFn: async () =>
          await createOrUpdateComponentTemplate({
            logger: this.logger,
            esClient,
            template: {
              name: 'kibana-execution-gap-log-mapping',
              // @ts-expect-error
              _meta: { managed: true },
              template: {
                settings: {},
                mappings: {
                  dynamic: 'strict',
                  properties: {
                    backfill_id: {
                      type: 'keyword',
                    },
                    rule_id: {
                      type: 'keyword',
                    },
                    start: {
                      type: 'date',
                    },
                    end: {
                      type: 'date',
                    },
                    duration: {
                      type: 'long',
                    },
                  },
                },
              },
            },
            totalFieldsLimit: 100,
          }),
        pluginStop$: this.pluginStop$,
        logger: this.logger,
        timeoutMs,
      });

      const initFns = [
        async () =>
          await createOrUpdateIndexTemplate({
            logger: this.logger,
            esClient,
            template: getIndexTemplate({
              componentTemplateRefs: ['kibana-execution-gap-log-mapping'],
              ilmPolicyName: '',
              indexPatterns: {
                template: '.kibana-execution-gap-log-default-index-template',
                pattern: '.kibana-execution-gap-log-default*',
                basePattern: '.kibana-execution-gap-log-default*',
                alias: '.kibana-execution-gap-log-default',
                name: '.kibana-execution-gap-log-default-000001',
              },
              kibanaVersion: '',
              namespace: DEFAULT_NAMESPACE_STRING,
              totalFieldsLimit: 1000,
              dataStreamAdapter: this.datastreamAdapter,
            }),
          }),
        async () =>
          await createConcreteWriteIndex({
            logger: this.logger,
            esClient,
            totalFieldsLimit: 1000,
            indexPatterns: {
              template: '.kibana-execution-gap-log-default-index-template',
              pattern: '.kibana-execution-gap-log-default*',
              basePattern: '.kibana-execution-gap-log-default*',
              alias: '.kibana-execution-gap-log-default',
              name: '.kibana-execution-gap-log-default-000001',
            },
            dataStreamAdapter: this.datastreamAdapter,
          }),
      ];

      // We want to install these in sequence and not in parallel because
      // the concrete index depends on the index template which depends on
      // the component template.
      for (const fn of initFns) {
        await installWithTimeout({
          installFn: async () => await fn(),
          pluginStop$: this.pluginStop$,
          logger: this.logger,
          timeoutMs,
        });
      }

      this.logger.info(`Finished initializing resources for Backfill client`);
      this.initialized = true;
      this.isInitializing = false;
    } catch (err) {
      if (err instanceof InstallShutdownError) {
        this.logger.debug(err.message);
      } else {
        this.logger.error(`Error installing resources for Backfill client - ${err.message}`);
      }

      this.initialized = false;
      this.isInitializing = false;
    }
  }

  public async writeGap(ruleId: string, gap: RuleExecutionGap | null) {
    if (!gap) {
      return;
    }

    if (this.isInitializing) {
      await this.initPromise;
    }

    if (!this.isInitializing && !this.initialized) {
      this.logger.error(`backfill client is not initializing and is not initialized`);
      return;
    }

    const esClient = await this.elasticsearchClientPromise;
    try {
      await esClient.index({
        index: '.kibana-execution-gap-log-default',
        refresh: false,
        document: {
          '@timestamp': new Date(),
          rule_id: ruleId,
          start: gap.gapStart,
          end: gap.gapEnd,
          duration: gap.gapDuration,
        },
      });
    } catch (err) {
      this.logger.error(
        `Error indexing gap data to .kibana-execution-gap-log-default - ${err.message}`
      );
    }
  }

  public async getGapsFor(ruleId: string): Promise<RuleExecutionGap[]> {
    if (this.isInitializing) {
      await this.initPromise;
    }

    if (!this.isInitializing && !this.initialized) {
      this.logger.error(`backfill client is not initializing and is not initialized`);
      return [];
    }

    const esClient = await this.elasticsearchClientPromise;
    try {
      const result = await esClient.search<RuleExecutionGap>({
        index: '.kibana-execution-gap-log-default',
        ignore_unavailable: true,
        body: {
          sort: [{ '@timestamp': { order: 'desc' } }],
          query: {
            bool: {
              filter: [{ term: { rule_id: ruleId } }],
            },
          },
          size: 10000,
          track_total_hits: true,
        },
      });
      return result.hits.hits.map((hit) => ({ _id: hit._id, ...hit._source! }));
    } catch (err) {
      this.logger.error(`Error searching gap data for ruleId ${ruleId} - ${err.message}`);
    }

    return [];
  }

  public async updateDoc(ruleId: string): Promise<RuleExecutionGap[]> {
    if (this.isInitializing) {
      await this.initPromise;
    }

    if (!this.isInitializing && !this.initialized) {
      this.logger.error(`backfill client is not initializing and is not initialized`);
      return [];
    }

    const esClient = await this.elasticsearchClientPromise;
    try {
      const result = await esClient.search<RuleExecutionGap>({
        index: '.kibana-execution-gap-log-default',
        ignore_unavailable: true,
        body: {
          sort: [{ '@timestamp': { order: 'desc' } }],
          query: {
            bool: {
              filter: [{ term: { rule_id: ruleId } }],
            },
          },
          size: 10000,
          track_total_hits: true,
        },
      });
      return result.hits.hits.map((hit) => hit._source!);
    } catch (err) {
      this.logger.error(`Error searching gap data for ruleId ${ruleId} - ${err.message}`);
    }

    return [];
  }

  public async bulkQueue({
    unsecuredSavedObjectsClient,
    rules,
    spaceId,
    options,
    ruleTypeRegistry,
  }: BulkQueueOpts): Promise<ScheduleBackfillResults> {
    const bulkResponse = await unsecuredSavedObjectsClient.bulkCreate<AdHocRuleRunParams>(
      rules.map((rule: RuleDomain) => ({
        type: 'backfill_params',
        attributes: {
          apiKeyId: Buffer.from(rule.apiKey!, 'base64').toString().split(':')[0],
          apiKeyToUse: rule.apiKey!,
          createdAt: new Date().toISOString(),
          currentStart: options.start,
          duration: rule.schedule.interval,
          enabled: true,
          ...(options.end ? { end: options.end } : {}),
          rule: {
            id: rule.id,
            name: rule.name,
            tags: rule.tags,
            alertTypeId: rule.alertTypeId,
            params: rule.params,
            apiKeyOwner: rule.apiKeyOwner,
            apiKeyCreatedByUser: rule.apiKeyCreatedByUser,
            consumer: rule.consumer,
            enabled: rule.enabled,
            schedule: rule.schedule,
            createdBy: rule.createdBy,
            updatedBy: rule.updatedBy,
            createdAt: rule.createdAt,
            updatedAt: rule.updatedAt,
            revision: rule.revision,
          },
          spaceId,
          start: options.start,
          status: 'Pending',
          schedule: calculateExecutionSets(
            this.logger,
            options.start,
            rule.schedule.interval,
            options.end
          ),
        },
      }))
    );

    this.logger.info(`queue response ${JSON.stringify(bulkResponse)}`);

    // Bulk schedule the backfill
    // const taskManager = await this.getTaskManager();
    // await taskManager.bulkSchedule(
    //   bulkResponse.saved_objects
    //     .filter((so) => !so.error)
    //     .map((so) => {
    //       const ruleTypeTimeout = ruleTypeRegistry.get(
    //         so.attributes.rule.alertTypeId
    //       ).ruleTaskTimeout;
    //       return {
    //         id: so.id,
    //         taskType: this.backfillTaskType,
    //         ...(ruleTypeTimeout ? { timeoutOverride: ruleTypeTimeout } : {}),
    //         state: {},
    //         params: {
    //           adHocRuleRunParamsId: so.id,
    //           spaceId,
    //         },
    //       };
    //     })
    // );
    // TODO retry errors
    return bulkResponse.saved_objects.map((so, index) => ({
      ruleId: rules[index].id,
      backfillId: so.error ? null : so.id,
      backfillRuns: so.error ? [] : so.attributes.schedule,
    }));
  }

  private async getTaskManager(): Promise<TaskManagerStartContract> {
    if (this.taskManager) {
      return this.taskManager;
    }

    const [_, alertingStart] = await this.coreStartServices;
    this.taskManager = alertingStart.taskManager;
    return this.taskManager;
  }
}

function calculateExecutionSets(logger: Logger, start: string, duration: string, end?: string) {
  const executionSet: Array<{ start: string; end: string }> = [];

  let currentStart = start;
  let currentEnd;
  do {
    const nowDate = new Date(new Date(currentStart).valueOf() + parseDuration(duration));
    const { dateStart, dateEnd } = getTimeRange({
      logger,
      nowDate: nowDate.toISOString(),
      window: duration,
    });
    currentEnd = end && new Date(dateEnd).valueOf() > new Date(end).valueOf() ? end : dateEnd;
    executionSet.push({ start: dateStart, end: currentEnd });
    currentStart = currentEnd;
  } while (end && currentEnd && new Date(currentEnd).valueOf() < new Date(end).valueOf());

  return executionSet;
}
