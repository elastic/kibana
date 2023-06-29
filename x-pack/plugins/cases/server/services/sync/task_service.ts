/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asSavedObjectExecutionSource } from '@kbn/actions-plugin/server';
import { CaseStatuses } from '@kbn/cases-components';
import type { KibanaRequest, SavedObject, SavedObjectsFindResponse } from '@kbn/core/server';
import { fromKueryExpression } from '@kbn/es-query';
import { getFakeKibanaRequest } from '@kbn/security-plugin/server/authentication/api_keys/fake_kibana_request';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { CaseAttributes } from '../../../common/api';
import {
  CASE_SAVED_OBJECT,
  CASE_SYNC_API_KEY_SAVED_OBJECT,
  CASE_SYNC_SAVED_OBJECT,
  SAVED_OBJECT_TYPES,
} from '../../../common/constants';
import type { CasesClient } from '../../client';
import { addStatusFilter, buildFilter, combineFilters } from '../../client/utils';
import { CASES_SYNC_TASK_NAME } from '../../sync';
import { AttachmentService } from '../attachments';
import { CasesService } from '../cases';
import { ApiKeyService } from './api_service';
import { translate } from './jira_mapping';
import { SyncSavedObjectService } from './saved_object_service';
import type { JiraIncidentResponse, Sync, SyncApiKey, SyncTaskContext } from './types';

const SOS_AND_SYNC = [
  ...SAVED_OBJECT_TYPES,
  CASE_SYNC_SAVED_OBJECT,
  CASE_SYNC_API_KEY_SAVED_OBJECT,
];

export class Syncer {
  protected context?: SyncTaskContext;

  public async initializeApiKey(request: KibanaRequest) {
    if (!this.context) {
      throw new Error('The Syncer context must be initialized before initializing the api key');
    }

    const apiKey = await this.context?.security.authc.apiKeys.create(request, {
      name: 'sync-api-key',
      kibana_role_descriptors: {},
    });

    if (!apiKey) {
      throw new Error('Failed to generate api key');
    }

    const apiKeyService = new ApiKeyService({
      log: this.context.logger,
      unsecuredSavedObjectsClient:
        this.context.core.savedObjects.createInternalRepository(SOS_AND_SYNC),
    });

    await apiKeyService.create(apiKey);
  }

  public initialize(context: SyncTaskContext) {
    if (!this.context) {
      this.context = context;
    }
  }

  public async run() {
    this.validateInitialization();

    const soClient = this.context.core.savedObjects.createInternalRepository(SOS_AND_SYNC);

    const attachmentService = new AttachmentService({
      log: this.context.logger,
      persistableStateAttachmentTypeRegistry: this.context.persistableStateAttachmentTypeRegistry,
      unsecuredSavedObjectsClient: soClient,
    });

    const caseService = new CasesService({
      log: this.context.logger,
      unsecuredSavedObjectsClient: soClient,
      attachmentService,
    });

    const cases = await caseService.findCases({ filter: createFilter(), perPage: 5 });
    console.log('num cases found', cases.saved_objects.length);

    const casesGroupedByConnectorId = groupByConnectorId(cases);

    const syncService = new SyncSavedObjectService({
      log: this.context.logger,
      unsecuredSavedObjectsClient: soClient,
    });

    const casesClient = await this.context.casesClientFactory.create({
      request: await this.getFakeKibanaRequest(),
      savedObjectsService: this.context.core.savedObjects,
      scopedClusterClient: this.context.core.elasticsearch.client.asInternalUser,
    });

    for (const [connectorId, caseInfo] of casesGroupedByConnectorId.entries()) {
      const syncInfo = await syncService.get({ connectorId, caseId: caseInfo.id });

      if (!syncInfo) {
        await this.pushCaseToExternal({
          connectorId,
          caseInfo,
          syncService,
          casesClient,
          syncInfo,
        });
      } else {
        const externalIncident = await this.getExternalIncident({
          caseId: caseInfo.id,
          connectorId,
          syncInfo,
        });

        const comparableCase = translate(externalIncident);
        console.log('comparableCase', JSON.stringify(comparableCase, null, 2));

        const lastSyncedAt = new Date(syncInfo.attributes.lastSyncedAt);
        const caseInfoUpdatedAt = new Date(caseInfo.attributes.updated_at ?? 0);
        const externalIncidentUpdatedAt = new Date(externalIncident.updated);

        if (caseInfoUpdatedAt > lastSyncedAt && externalIncidentUpdatedAt > lastSyncedAt) {
          // TODO: conflict use the kibana case
          console.log('encountered a conflict taking everything from the case');
          await this.pushCaseToExternal({
            connectorId,
            caseInfo,
            syncService,
            casesClient,
            syncInfo,
          });
        } else if (caseInfoUpdatedAt > lastSyncedAt) {
          await this.pushCaseToExternal({
            connectorId,
            caseInfo,
            syncService,
            casesClient,
            syncInfo,
          });
        } else if (externalIncidentUpdatedAt > lastSyncedAt) {
          // TODO: implement a partial update
          console.log('doing a case update');
          await casesClient.cases.update({
            cases: [
              {
                id: caseInfo.id,
                version: caseInfo.version ?? '',
                title: comparableCase.title,
                description: comparableCase.description,
                status: comparableCase.status,
              },
            ],
          });

          const syncTimestamp = new Date().toISOString();

          await syncService.update({
            connectorId,
            caseId: caseInfo.id,
            lastSyncedAt: syncTimestamp,
            version: syncInfo.version ?? '',
          });
        } else {
          console.log('no changes found');
        }
      }
    }
  }

  private async pushCaseToExternal({
    connectorId,
    caseInfo,
    syncService,
    casesClient,
    syncInfo,
  }: {
    connectorId: string;
    caseInfo: SavedObject<CaseAttributes>;
    syncService: SyncSavedObjectService;
    casesClient: CasesClient;
    syncInfo?: SavedObject<Sync>;
  }) {
    this.validateInitialization();

    console.log('going to push case');
    const pushRes = await casesClient.cases.push({ caseId: caseInfo.id, connectorId });

    const syncTimestamp = new Date().toISOString();

    if (!syncInfo) {
      console.log('create sync info');
      await syncService.create({
        connectorId,
        caseId: caseInfo.id,
        // TODO: fix me
        externalId: pushRes.external_service?.external_id ?? '',
        lastSyncedAt: syncTimestamp,
      });

      return;
    }

    console.log('updating sync info');
    await syncService.update({
      connectorId,
      caseId: caseInfo.id,
      lastSyncedAt: syncTimestamp,
      version: syncInfo.version ?? '',
    });
  }

  public async schedule() {
    this.validateInitialization();

    try {
      await this.context.taskManagerStart.ensureScheduled({
        id: CASES_SYNC_TASK_NAME,
        taskType: CASES_SYNC_TASK_NAME,
        schedule: {
          interval: `3s`,
        },
        scope: ['cases'],
        params: {},
        state: {},
      });
    } catch (error) {
      this.context.logger.debug(
        `Error scheduling cases task with ID ${CASES_SYNC_TASK_NAME}. Received ${error.message}`
      );

      throw error;
    }
  }

  private validateInitialization(): asserts this is this & {
    context: Omit<SyncTaskContext, 'taskManagerStart'> & {
      taskManagerStart: TaskManagerStartContract;
    };
  } {
    if (!this.context) {
      throw new Error('Service must be initialized with a context before starting');
    }

    if (!this.context.taskManagerStart) {
      throw new Error('Task manager is not available');
    }
  }

  private async getFakeKibanaRequest() {
    const apiKeySo = await this.getApiKey();
    const apiKey = { id: apiKeySo.attributes.apiKeyId, api_key: apiKeySo.attributes.apiKey };

    return getFakeKibanaRequest(apiKey);
  }

  private async getApiKey(): Promise<SavedObject<SyncApiKey>> {
    this.validateInitialization();

    const apiKeyService = new ApiKeyService({
      log: this.context.logger,
      unsecuredSavedObjectsClient:
        this.context.core.savedObjects.createInternalRepository(SOS_AND_SYNC),
    });

    const apiKey = await apiKeyService.get();

    if (!apiKey) {
      throw new Error('The api key has not been initialized yet, please call _start_sync');
    }

    return apiKey;
  }

  private async getExternalIncident({
    connectorId,
    caseId,
    syncInfo,
  }: {
    connectorId: string;
    caseId: string;
    syncInfo: SavedObject<Sync>;
  }) {
    this.validateInitialization();

    const actionsClient = await this.context.actionsPluginStart.getActionsClientWithRequest(
      await this.getFakeKibanaRequest()
    );

    const externalIncident = await actionsClient.execute({
      actionId: connectorId,
      params: {
        subAction: 'getIncident',
        subActionParams: {
          externalId: syncInfo.attributes.externalId,
        },
      },
      source: asSavedObjectExecutionSource({ id: caseId, type: CASE_SAVED_OBJECT }),
    });

    if (externalIncident.status === 'error') {
      throw new Error(
        `Failed to retrieve the external incident: ${
          externalIncident.serviceMessage ?? externalIncident.message
        }`
      );
    }

    // TODO: validate that the results are in fact this structure
    const data = externalIncident.data as JiraIncidentResponse;
    return data;
  }
}

const createFilter = () => {
  const openStatusFilter = addStatusFilter(CaseStatuses.open);
  const inProgressFilter = addStatusFilter(CaseStatuses['in-progress']);

  const statusFilters = combineFilters([openStatusFilter, inProgressFilter], 'or');

  const externalSyncEnabled = buildFilter({
    filters: 'true',
    field: 'settings.externalSync',
    operator: 'or',
  });

  // TODO: ideally we'd search for any cases that have a valid connector.id reference but I don't know how to do that
  // because it requires searching within the nested references field instead of attributes and I don't think it's possible
  // to do it with the saved object framework right now
  const hasConnector = fromKueryExpression(
    `not ${CASE_SAVED_OBJECT}.attributes.connector.type: ".none"`
  );

  return combineFilters([statusFilters, externalSyncEnabled, hasConnector]);
};

const groupByConnectorId = (cases: SavedObjectsFindResponse<CaseAttributes>) => {
  const casesByConnector = new Map<string, SavedObject<CaseAttributes>>(
    cases.saved_objects.map((theCase) => {
      return [theCase.attributes.connector.id, theCase];
    })
  );

  return casesByConnector;
};
