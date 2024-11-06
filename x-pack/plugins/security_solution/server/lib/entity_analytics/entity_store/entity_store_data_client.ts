/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  ElasticsearchClient,
  SavedObjectsClientContract,
  AuditLogger,
  IScopedClusterClient,
  AuditEvent,
  AnalyticsServiceSetup,
} from '@kbn/core/server';
import { EntityClient } from '@kbn/entityManager-plugin/server/lib/entity_client';
import type { SortOrder } from '@elastic/elasticsearch/lib/api/types';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import { isEqual } from 'lodash/fp';
import moment from 'moment';
import type { AppClient } from '../../..';
import type {
  Entity,
  EngineDataviewUpdateResult,
  InitEntityEngineRequestBody,
  InitEntityEngineResponse,
  EntityType,
  InspectQuery,
} from '../../../../common/api/entity_analytics';
import { EngineDescriptorClient } from './saved_object/engine_descriptor';
import { ENGINE_STATUS, MAX_SEARCH_RESPONSE_SIZE } from './constants';
import { AssetCriticalityEcsMigrationClient } from '../asset_criticality/asset_criticality_migration_client';
import { getUnitedEntityDefinition } from './united_entity_definitions';
import {
  startEntityStoreFieldRetentionEnrichTask,
  removeEntityStoreFieldRetentionEnrichTask,
} from './task';
import {
  createEntityIndex,
  deleteEntityIndex,
  createPlatformPipeline,
  deletePlatformPipeline,
  createEntityIndexComponentTemplate,
  deleteEntityIndexComponentTemplate,
  createFieldRetentionEnrichPolicy,
  executeFieldRetentionEnrichPolicy,
  deleteFieldRetentionEnrichPolicy,
} from './elasticsearch_assets';
import { RiskScoreDataClient } from '../risk_score/risk_score_data_client';
import {
  buildEntityDefinitionId,
  buildIndexPatterns,
  getEntitiesIndexName,
  isPromiseFulfilled,
  isPromiseRejected,
} from './utils';
import { EntityEngineActions } from './auditing/actions';
import { EntityStoreResource } from './auditing/resources';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../audit';
import type { EntityRecord, EntityStoreConfig } from './types';
import {
  ENTITY_ENGINE_INITIALIZATION_EVENT,
  ENTITY_ENGINE_RESOURCE_INIT_FAILURE_EVENT,
} from '../../telemetry/event_based/events';
import { CRITICALITY_VALUES } from '../asset_criticality/constants';

interface EntityStoreClientOpts {
  logger: Logger;
  clusterClient: IScopedClusterClient;
  namespace: string;
  soClient: SavedObjectsClientContract;
  taskManager?: TaskManagerStartContract;
  auditLogger?: AuditLogger;
  kibanaVersion: string;
  dataViewsService: DataViewsService;
  appClient: AppClient;
  config: EntityStoreConfig;
  telemetry?: AnalyticsServiceSetup;
}

interface SearchEntitiesParams {
  entityTypes: EntityType[];
  filterQuery?: string;
  page: number;
  perPage: number;
  sortField: string;
  sortOrder: SortOrder;
}

export class EntityStoreDataClient {
  private engineClient: EngineDescriptorClient;
  private assetCriticalityMigrationClient: AssetCriticalityEcsMigrationClient;
  private entityClient: EntityClient;
  private riskScoreDataClient: RiskScoreDataClient;
  private esClient: ElasticsearchClient;

  constructor(private readonly options: EntityStoreClientOpts) {
    const { clusterClient, logger, soClient, auditLogger, kibanaVersion, namespace } = options;
    this.esClient = clusterClient.asCurrentUser;

    this.entityClient = new EntityClient({
      clusterClient,
      soClient,
      logger,
    });

    this.engineClient = new EngineDescriptorClient({
      soClient,
      namespace,
    });

    this.assetCriticalityMigrationClient = new AssetCriticalityEcsMigrationClient({
      esClient: this.esClient,
      logger,
      auditLogger,
    });

    this.riskScoreDataClient = new RiskScoreDataClient({
      soClient,
      esClient: this.esClient,
      logger,
      namespace,
      kibanaVersion,
    });
  }

  public async init(
    entityType: EntityType,
    { indexPattern = '', filter = '', fieldHistoryLength = 10 }: InitEntityEngineRequestBody,
    { pipelineDebugMode = false }: { pipelineDebugMode?: boolean } = {}
  ): Promise<InitEntityEngineResponse> {
    if (!this.options.taskManager) {
      throw new Error('Task Manager is not available');
    }

    const { config } = this.options;

    await this.riskScoreDataClient.createRiskScoreLatestIndex();

    const requiresMigration =
      await this.assetCriticalityMigrationClient.isEcsDataMigrationRequired();

    if (requiresMigration) {
      throw new Error(
        'Asset criticality data migration is required before initializing entity store. If this error persists, please restart Kibana.'
      );
    }

    this.log('info', entityType, `Initializing entity store`);
    this.audit(
      EntityEngineActions.INIT,
      EntityStoreResource.ENTITY_ENGINE,
      entityType,
      'Initializing entity engine'
    );

    const descriptor = await this.engineClient.init(entityType, {
      filter,
      fieldHistoryLength,
      indexPattern,
    });
    this.log('debug', entityType, `Initialized engine saved object`);

    this.asyncSetup(
      entityType,
      fieldHistoryLength,
      this.options.taskManager,
      indexPattern,
      filter,
      config,
      pipelineDebugMode
    ).catch((e) =>
      this.log('error', entityType, `Error during async setup of entity store: ${e.message}`)
    );

    return descriptor;
  }

  private async asyncSetup(
    entityType: EntityType,
    fieldHistoryLength: number,
    taskManager: TaskManagerStartContract,
    indexPattern: string,
    filter: string,
    config: EntityStoreConfig,
    pipelineDebugMode: boolean
  ) {
    const setupStartTime = moment().utc().toISOString();
    const { logger, namespace, appClient, dataViewsService } = this.options;
    const indexPatterns = await buildIndexPatterns(namespace, appClient, dataViewsService);

    const unitedDefinition = getUnitedEntityDefinition({
      indexPatterns,
      entityType,
      namespace,
      fieldHistoryLength,
      syncDelay: `${config.syncDelay.asSeconds()}s`,
      frequency: `${config.frequency.asSeconds()}s`,
    });
    const { entityManagerDefinition } = unitedDefinition;

    try {
      // clean up any existing entity store
      await this.delete(entityType, taskManager, { deleteData: false, deleteEngine: false });

      // set up the entity manager definition
      await this.entityClient.createEntityDefinition({
        definition: {
          ...entityManagerDefinition,
          filter,
          indexPatterns: indexPattern
            ? [...entityManagerDefinition.indexPatterns, ...indexPattern.split(',')]
            : entityManagerDefinition.indexPatterns,
        },
        installOnly: true,
      });
      this.log(`debug`, entityType, `Created entity definition`);

      // the index must be in place with the correct mapping before the enrich policy is created
      // this is because the enrich policy will fail if the index does not exist with the correct fields
      await createEntityIndexComponentTemplate({
        unitedDefinition,
        esClient: this.esClient,
      });
      this.log(`debug`, entityType, `Created entity index component template`);
      await createEntityIndex({
        entityType,
        esClient: this.esClient,
        namespace,
        logger,
      });
      this.log(`debug`, entityType, `Created entity index`);

      // we must create and execute the enrich policy before the pipeline is created
      // this is because the pipeline will fail if the enrich index does not exist
      await createFieldRetentionEnrichPolicy({
        unitedDefinition,
        esClient: this.esClient,
      });
      this.log(`debug`, entityType, `Created field retention enrich policy`);

      await executeFieldRetentionEnrichPolicy({
        unitedDefinition,
        esClient: this.esClient,
        logger,
      });
      this.log(`debug`, entityType, `Executed field retention enrich policy`);
      await createPlatformPipeline({
        debugMode: pipelineDebugMode,
        unitedDefinition,
        logger,
        esClient: this.esClient,
      });
      this.log(`debug`, entityType, `Created @platform pipeline`);

      // finally start the entity definition now that everything is in place
      const updated = await this.start(entityType, { force: true });

      // the task will execute the enrich policy on a schedule
      await startEntityStoreFieldRetentionEnrichTask({
        namespace,
        logger,
        taskManager,
      });

      this.log(`debug`, entityType, `Started entity store field retention enrich task`);
      this.log(`info`, entityType, `Entity store initialized`);

      const setupEndTime = moment().utc().toISOString();
      const duration = moment(setupEndTime).diff(moment(setupStartTime), 'seconds');
      this.options.telemetry?.reportEvent(ENTITY_ENGINE_INITIALIZATION_EVENT.eventType, {
        duration,
      });

      return updated;
    } catch (err) {
      this.log(`error`, entityType, `Error initializing entity store: ${err.message}`);

      this.audit(
        EntityEngineActions.INIT,
        EntityStoreResource.ENTITY_ENGINE,
        entityType,
        'Failed to initialize entity engine resources',
        err
      );

      this.options.telemetry?.reportEvent(ENTITY_ENGINE_RESOURCE_INIT_FAILURE_EVENT.eventType, {
        error: err.message,
      });

      await this.engineClient.update(entityType, {
        status: ENGINE_STATUS.ERROR,
        error: {
          message: err.message,
          stack: err.stack,
          action: 'init',
        },
      });

      await this.delete(entityType, taskManager, { deleteData: true, deleteEngine: false });
    }
  }

  public async getExistingEntityDefinition(entityType: EntityType) {
    const entityDefinitionId = buildEntityDefinitionId(entityType, this.options.namespace);

    const {
      definitions: [definition],
    } = await this.entityClient.getEntityDefinitions({
      id: entityDefinitionId,
    });

    if (!definition) {
      throw new Error(`Unable to find entity definition for ${entityType}`);
    }

    return definition;
  }

  public async start(entityType: EntityType, options?: { force: boolean }) {
    const { namespace } = this.options;
    const descriptor = await this.engineClient.get(entityType);
    if (!options?.force && descriptor.status !== ENGINE_STATUS.STOPPED) {
      throw new Error(
        `In namespace ${namespace}: Cannot start Entity engine for ${entityType} when current status is: ${descriptor.status}`
      );
    }

    this.log('info', entityType, `Starting entity store`);

    // startEntityDefinition requires more fields than the engine descriptor
    // provides so we need to fetch the full entity definition
    const fullEntityDefinition = await this.getExistingEntityDefinition(entityType);
    this.audit(
      EntityEngineActions.START,
      EntityStoreResource.ENTITY_DEFINITION,
      entityType,
      'Starting entity definition'
    );
    await this.entityClient.startEntityDefinition(fullEntityDefinition);
    this.log('debug', entityType, `Started entity definition`);

    return this.engineClient.updateStatus(entityType, ENGINE_STATUS.STARTED);
  }

  public async stop(entityType: EntityType) {
    const { namespace } = this.options;
    const descriptor = await this.engineClient.get(entityType);

    if (descriptor.status !== ENGINE_STATUS.STARTED) {
      throw new Error(
        `In namespace ${namespace}: Cannot stop Entity engine for ${entityType} when current status is: ${descriptor.status}`
      );
    }

    this.log('info', entityType, `Stopping entity store`);

    // stopEntityDefinition requires more fields than the engine descriptor
    // provides so we need to fetch the full entity definition
    const fullEntityDefinition = await this.getExistingEntityDefinition(entityType);
    this.audit(
      EntityEngineActions.STOP,
      EntityStoreResource.ENTITY_DEFINITION,
      entityType,
      'Stopping entity definition'
    );
    await this.entityClient.stopEntityDefinition(fullEntityDefinition);
    this.log('debug', entityType, `Stopped entity definition`);

    return this.engineClient.updateStatus(entityType, ENGINE_STATUS.STOPPED);
  }

  public async get(entityType: EntityType) {
    return this.engineClient.get(entityType);
  }

  public async list() {
    return this.engineClient.list();
  }

  public async delete(
    entityType: EntityType,
    taskManager: TaskManagerStartContract,
    options = { deleteData: false, deleteEngine: true }
  ) {
    const { namespace, logger, appClient, dataViewsService, config } = this.options;
    const { deleteData, deleteEngine } = options;

    const descriptor = await this.engineClient.maybeGet(entityType);
    const indexPatterns = await buildIndexPatterns(namespace, appClient, dataViewsService);

    // TODO delete unitedDefinition from this method. we only need the id for deletion
    const unitedDefinition = getUnitedEntityDefinition({
      indexPatterns,
      entityType,
      namespace: this.options.namespace,
      fieldHistoryLength: descriptor?.fieldHistoryLength ?? 10,
      syncDelay: `${config.syncDelay.asSeconds()}s`,
      frequency: `${config.frequency.asSeconds()}s`,
    });
    const { entityManagerDefinition } = unitedDefinition;

    this.log('info', entityType, `Deleting entity store`);
    this.audit(
      EntityEngineActions.DELETE,
      EntityStoreResource.ENTITY_ENGINE,
      entityType,
      'Deleting entity engine'
    );

    try {
      await this.entityClient
        .deleteEntityDefinition({
          id: entityManagerDefinition.id,
          deleteData,
        })
        // Swallowing the error as it is expected to fail if no entity definition exists
        .catch((e) =>
          this.log(`warn`, entityType, `Error deleting entity definition: ${e.message}`)
        );
      this.log('debug', entityType, `Deleted entity definition`);

      await deleteEntityIndexComponentTemplate({
        unitedDefinition,
        esClient: this.esClient,
      });
      this.log('debug', entityType, `Deleted entity index component template`);

      await deletePlatformPipeline({
        unitedDefinition,
        logger,
        esClient: this.esClient,
      });
      this.log('debug', entityType, `Deleted platform pipeline`);

      await deleteFieldRetentionEnrichPolicy({
        unitedDefinition,
        esClient: this.esClient,
        logger,
      });
      this.log('debug', entityType, `Deleted field retention enrich policy`);

      if (deleteData) {
        await deleteEntityIndex({
          entityType,
          esClient: this.esClient,
          namespace,
          logger,
        });
        this.log('debug', entityType, `Deleted entity index`);
      }

      if (descriptor && deleteEngine) {
        await this.engineClient.delete(entityType);
      }
      // if the last engine then stop the task
      const { engines } = await this.engineClient.list();
      if (engines.length === 0) {
        await removeEntityStoreFieldRetentionEnrichTask({
          namespace,
          logger,
          taskManager,
        });
        this.log('debug', entityType, `Deleted entity store field retention enrich task`);
      }

      logger.info(`[Entity Store] In namespace ${namespace}: Deleted store for ${entityType}`);
      return { deleted: true };
    } catch (err) {
      this.log(`error`, entityType, `Error deleting entity store: ${err.message}`);

      this.audit(
        EntityEngineActions.DELETE,
        EntityStoreResource.ENTITY_ENGINE,
        entityType,
        'Failed to delete entity engine',
        err
      );

      throw err;
    }
  }

  public async searchEntities(params: SearchEntitiesParams): Promise<{
    records: Entity[];
    total: number;
    inspect: InspectQuery;
  }> {
    const { page, perPage, sortField, sortOrder, filterQuery, entityTypes } = params;

    const index = entityTypes.map((type) => getEntitiesIndexName(type, this.options.namespace));
    const from = (page - 1) * perPage;
    const sort = sortField ? [{ [sortField]: sortOrder }] : undefined;
    const query = filterQuery ? JSON.parse(filterQuery) : undefined;

    const response = await this.esClient.search<EntityRecord>({
      index,
      query,
      size: Math.min(perPage, MAX_SEARCH_RESPONSE_SIZE),
      from,
      sort,
      ignore_unavailable: true,
    });
    const { hits } = response;

    const total = typeof hits.total === 'number' ? hits.total : hits.total?.value ?? 0;

    const records = hits.hits.map((hit) => {
      const { asset, ...source } = hit._source as EntityRecord;

      const assetOverwrite: Pick<Entity, 'asset'> =
        asset && asset.criticality !== CRITICALITY_VALUES.DELETED
          ? { asset: { criticality: asset.criticality } }
          : {};

      return {
        ...source,
        ...assetOverwrite,
      };
    });

    const inspect: InspectQuery = {
      dsl: [JSON.stringify({ index, body: query }, null, 2)],
      response: [JSON.stringify(response, null, 2)],
    };

    return { records, total, inspect };
  }

  public async applyDataViewIndices(): Promise<{
    successes: EngineDataviewUpdateResult[];
    errors: Error[];
  }> {
    const { logger } = this.options;
    logger.info(
      `In namespace ${this.options.namespace}: Applying data view indices to the entity store`
    );

    const { engines } = await this.engineClient.list();

    const updateDefinitionPromises: Array<Promise<EngineDataviewUpdateResult>> = await engines.map(
      async (engine) => {
        const originalStatus = engine.status;
        const id = buildEntityDefinitionId(engine.type, this.options.namespace);
        const definition = await this.getExistingEntityDefinition(engine.type);

        if (
          originalStatus === ENGINE_STATUS.INSTALLING ||
          originalStatus === ENGINE_STATUS.UPDATING
        ) {
          throw new Error(
            `Error updating entity store: There are changes already in progress for engine ${id}`
          );
        }

        const indexPatterns = await buildIndexPatterns(
          this.options.namespace,
          this.options.appClient,
          this.options.dataViewsService
        );

        // Skip update if index patterns are the same
        if (isEqual(definition.indexPatterns, indexPatterns)) {
          return { type: engine.type, changes: {} };
        }

        // Update savedObject status
        await this.engineClient.updateStatus(engine.type, ENGINE_STATUS.UPDATING);

        try {
          // Update entity manager definition
          await this.entityClient.updateEntityDefinition({
            id,
            definitionUpdate: {
              ...definition,
              indexPatterns,
            },
          });

          // Restore the savedObject status and set the new index pattern
          await this.engineClient.updateStatus(engine.type, originalStatus);

          return { type: engine.type, changes: { indexPatterns } };
        } catch (error) {
          // Rollback the engine initial status when the update fails
          await this.engineClient.updateStatus(engine.type, originalStatus);

          throw error;
        }
      }
    );

    const updatedDefinitions = await Promise.allSettled(updateDefinitionPromises);

    const updateErrors = updatedDefinitions
      .filter(isPromiseRejected)
      .map((result) => result.reason);

    const updateSuccesses = updatedDefinitions
      .filter(isPromiseFulfilled<EngineDataviewUpdateResult>)
      .map((result) => result.value);

    return {
      successes: updateSuccesses,
      errors: updateErrors,
    };
  }

  private log(
    level: Exclude<keyof Logger, 'get' | 'log' | 'isLevelEnabled'>,
    entityType: EntityType,
    msg: string
  ) {
    this.options.logger[level](
      `[Entity Engine] [entity.${entityType}] [namespace: ${this.options.namespace}] ${msg}`
    );
  }

  private audit(
    action: EntityEngineActions,
    resource: EntityStoreResource,
    entityType: EntityType,
    msg: string,
    error?: Error
  ) {
    // NOTE: Excluding errors, all auditing events are currently WRITE events, meaning the outcome is always UNKNOWN.
    // This may change in the future, depending on the audit action.
    const outcome = error ? AUDIT_OUTCOME.FAILURE : AUDIT_OUTCOME.UNKNOWN;

    const type =
      action === EntityEngineActions.CREATE
        ? AUDIT_TYPE.CREATION
        : EntityEngineActions.DELETE
        ? AUDIT_TYPE.DELETION
        : AUDIT_TYPE.CHANGE;

    const category = AUDIT_CATEGORY.DATABASE;

    const message = error ? `${msg}: ${error.message}` : msg;
    const event: AuditEvent = {
      message: `[Entity Engine] [entity.${entityType}] ${message}`,
      event: {
        action: `${action}_${entityType}_${resource}`,
        category,
        outcome,
        type,
      },
    };

    return this.options.auditLogger?.log(event);
  }
}
