/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, pick } from 'lodash';
import { estypes } from '@elastic/elasticsearch';
import {
  Logger,
  SavedObject,
  PluginInitializerContext,
  SavedObjectsUtils,
  ElasticsearchClient,
} from '../../../../../src/core/server';
import { esKuery } from '../../../../../src/plugins/data/server';
import {
  GrantAPIKeyResult as SecurityPluginGrantAPIKeyResult,
  InvalidateAPIKeyResult as SecurityPluginInvalidateAPIKeyResult,
} from '../../../security/server';

// TODO: implement the authorization class
import {
  RacAuthorization,
  WriteOperations,
  ReadOperations,
} from '../authorization/rac_authorization';
import { AuditLogger, EventOutcome } from '../../../security/server';
// TODO: later
// import { alertAuditEvent, AlertAuditAction } from './audit_events';
import { nodeBuilder } from '../../../../../src/plugins/data/common';

// export interface RegistryAlertTypeWithAuth extends RegistryAlertType {
//   authorizedConsumers: string[];
// }
// type NormalizedAlertAction = Omit<AlertAction, 'actionTypeId'>;
export type CreateAPIKeyResult =
  | { apiKeysEnabled: false }
  | { apiKeysEnabled: true; result: SecurityPluginGrantAPIKeyResult };
export type InvalidateAPIKeyResult =
  | { apiKeysEnabled: false }
  | { apiKeysEnabled: true; result: SecurityPluginInvalidateAPIKeyResult };

export interface ConstructorOptions {
  logger: Logger;
  authorization: RacAuthorization;
  spaceId?: string;
  kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
  auditLogger?: AuditLogger;
  esClient: ElasticsearchClient;
}

export interface FindOptions extends IndexType {
  perPage?: number;
  page?: number;
  search?: string;
  defaultSearchOperator?: 'AND' | 'OR';
  searchFields?: string[];
  sortField?: string;
  sortOrder?: estypes.SortOrder;
  hasReference?: {
    type: string;
    id: string;
  };
  fields?: string[];
  filter?: string;
}

interface IndexType {
  [key: string]: unknown;
}

export interface AggregateResult {
  alertExecutionStatus: { [status: string]: number };
}

export interface FindResult<Params extends AlertTypeParams> {
  page: number;
  perPage: number;
  total: number;
  data: Array<SanitizedAlert<Params>>;
}

export interface CreateOptions<Params extends AlertTypeParams> {
  data: Omit<
    Alert<Params>,
    | 'id'
    | 'createdBy'
    | 'updatedBy'
    | 'createdAt'
    | 'updatedAt'
    | 'apiKey'
    | 'apiKeyOwner'
    | 'muteAll'
    | 'mutedInstanceIds'
    | 'actions'
    | 'executionStatus'
  > & { actions: NormalizedAlertAction[] };
  options?: {
    id?: string;
    migrationVersion?: Record<string, string>;
  };
}

export interface UpdateOptions<Params extends AlertTypeParams> {
  id: string;
  data: {
    name: string;
    tags: string[];
    schedule: IntervalSchedule;
    actions: NormalizedAlertAction[];
    params: Params;
    throttle: string | null;
    notifyWhen: AlertNotifyWhenType | null;
  };
}

export interface GetAlertInstanceSummaryParams {
  id: string;
  dateStart?: string;
}

export class RacClient {
  private readonly logger: Logger;
  private readonly spaceId?: string;
  private readonly authorization: RacAuthorization;
  private readonly kibanaVersion!: PluginInitializerContext['env']['packageInfo']['version'];
  private readonly auditLogger?: AuditLogger;
  private readonly esClient: ElasticsearchClient;

  constructor({
    authorization,
    logger,
    spaceId,
    kibanaVersion,
    auditLogger,
    esClient,
  }: ConstructorOptions) {
    this.logger = logger;
    this.spaceId = spaceId;
    this.authorization = authorization;
    this.kibanaVersion = kibanaVersion;
    this.auditLogger = auditLogger;
    this.esClient = esClient;
  }

  public async create<Params>({
    data,
    options,
  }: CreateOptions<Params>): Promise<SanitizedAlert<Params>> {
    // const id = options?.id || SavedObjectsUtils.generateId();
    // try {
    //   await this.authorization.ensureAuthorized(
    //     data.alertTypeId,
    //     data.consumer,
    //     WriteOperations.Create
    //   );
    // } catch (error) {
    //   this.auditLogger?.log(
    //     alertAuditEvent({
    //       action: AlertAuditAction.CREATE,
    //       savedObject: { type: 'alert', id },
    //       error,
    //     })
    //   );
    //   throw error;
    // }
    // this.alertTypeRegistry.ensureAlertTypeEnabled(data.alertTypeId);
    // // Throws an error if alert type isn't registered
    // const alertType = this.alertTypeRegistry.get(data.alertTypeId);
    // const validatedAlertTypeParams = validateAlertTypeParams(
    //   data.params,
    //   alertType.validate?.params
    // );
    // const username = await this.getUserName();
    // const createdAPIKey = data.enabled
    //   ? await this.createAPIKey(this.generateAPIKeyName(alertType.id, data.name))
    //   : null;
    // this.validateActions(alertType, data.actions);
    // const createTime = Date.now();
    // const { references, actions } = await this.denormalizeActions(data.actions);
    // const notifyWhen = getAlertNotifyWhenType(data.notifyWhen, data.throttle);
    // const rawAlert: RawAlert = {
    //   ...data,
    //   ...this.apiKeyAsAlertAttributes(createdAPIKey, username),
    //   actions,
    //   createdBy: username,
    //   updatedBy: username,
    //   createdAt: new Date(createTime).toISOString(),
    //   updatedAt: new Date(createTime).toISOString(),
    //   params: validatedAlertTypeParams as RawAlert['params'],
    //   muteAll: false,
    //   mutedInstanceIds: [],
    //   notifyWhen,
    //   executionStatus: {
    //     status: 'pending',
    //     lastExecutionDate: new Date().toISOString(),
    //     error: null,
    //   },
    // };
    // this.auditLogger?.log(
    //   alertAuditEvent({
    //     action: AlertAuditAction.CREATE,
    //     outcome: EventOutcome.UNKNOWN,
    //     savedObject: { type: 'alert', id },
    //   })
    // );
    // let createdAlert: SavedObject<RawAlert>;
    // try {
    //   createdAlert = await this.unsecuredSavedObjectsClient.create(
    //     'alert',
    //     this.updateMeta(rawAlert),
    //     {
    //       ...options,
    //       references,
    //       id,
    //     }
    //   );
    // } catch (e) {
    //   // Avoid unused API key
    //   markApiKeyForInvalidation(
    //     { apiKey: rawAlert.apiKey },
    //     this.logger,
    //     this.unsecuredSavedObjectsClient
    //   );
    //   throw e;
    // }
    // if (data.enabled) {
    //   let scheduledTask;
    //   try {
    //     scheduledTask = await this.scheduleAlert(
    //       createdAlert.id,
    //       rawAlert.alertTypeId,
    //       data.schedule
    //     );
    //   } catch (e) {
    //     // Cleanup data, something went wrong scheduling the task
    //     try {
    //       await this.unsecuredSavedObjectsClient.delete('alert', createdAlert.id);
    //     } catch (err) {
    //       // Skip the cleanup error and throw the task manager error to avoid confusion
    //       this.logger.error(
    //         `Failed to cleanup alert "${createdAlert.id}" after scheduling task failed. Error: ${err.message}`
    //       );
    //     }
    //     throw e;
    //   }
    //   await this.unsecuredSavedObjectsClient.update<RawAlert>('alert', createdAlert.id, {
    //     scheduledTaskId: scheduledTask.id,
    //   });
    //   createdAlert.attributes.scheduledTaskId = scheduledTask.id;
    // }
    // return this.getAlertFromRaw<Params>(createdAlert.id, createdAlert.attributes, references);
  }

  public async get<Params>({ id }: { id: string }): Promise<unknown> {
    console.error('\n\n\n\n\nHELLO WORLD!!!!\n\n\n\n\n');
    // TODO: type alert for the get method
    const thing = await this.esClient.ping();
    console.error('PING RESULT', JSON.stringify(thing, null, 2));
    const result = await this.esClient.search({
      index: 'myfakeindex-1',
      body: { query: { match_all: {} } },
    });
    console.error(`************\nRESULT ${JSON.stringify(result, null, 2)}\n************`);
    // .get<RawAlert>('alert', id);
    try {
      await this.authorization.ensureAuthorized(
        // TODO: add spaceid here.. I think
        // result.body._source?.owner,
        'securitySolution',
        ReadOperations.Get
      );
    } catch (error) {
      // this.auditLogger?.log(
      //   alertAuditEvent({
      //     action: AlertAuditAction.GET,
      //     savedObject: { type: 'alert', id },
      //     error,
      //   })
      // );
      throw error;
    }
    // this.auditLogger?.log(
    //   alertAuditEvent({
    //     action: AlertAuditAction.GET,
    //     savedObject: { type: 'alert', id },
    //   })
    // );
    // TODO: strip out owner field maybe?
    // this.getAlertFromRaw<Params>(result.id, result.attributes, result.references);

    return result;

    // return Promise.resolve({ id: 'hello world!!!' });
    // const result = await this.unsecuredSavedObjectsClient.get<RawAlert>('alert', id);
    // try {
    //   await this.authorization.ensureAuthorized(
    //     result.attributes.alertTypeId,
    //     result.attributes.consumer,
    //     ReadOperations.Get
    //   );
    // } catch (error) {
    //   this.auditLogger?.log(
    //     alertAuditEvent({
    //       action: AlertAuditAction.GET,
    //       savedObject: { type: 'alert', id },
    //       error,
    //     })
    //   );
    //   throw error;
    // }
    // this.auditLogger?.log(
    //   alertAuditEvent({
    //     action: AlertAuditAction.GET,
    //     savedObject: { type: 'alert', id },
    //   })
    // );
    // return this.getAlertFromRaw<Params>(result.id, result.attributes, result.references);
  }

  public async find<Params extends AlertTypeParams = never>({
    options: { fields, ...options } = {},
  }: { options?: FindOptions } = {}): Promise<FindResult<Params>> {
    // let authorizationTuple;
    // try {
    //   authorizationTuple = await this.authorization.getFindAuthorizationFilter();
    // } catch (error) {
    //   this.auditLogger?.log(
    //     alertAuditEvent({
    //       action: AlertAuditAction.FIND,
    //       error,
    //     })
    //   );
    //   throw error;
    // }
    // const {
    //   filter: authorizationFilter,
    //   ensureAlertTypeIsAuthorized,
    //   logSuccessfulAuthorization,
    // } = authorizationTuple;
    // const {
    //   page,
    //   per_page: perPage,
    //   total,
    //   saved_objects: data,
    // } = await this.unsecuredSavedObjectsClient.find<RawAlert>({
    //   ...options,
    //   sortField: mapSortField(options.sortField),
    //   filter:
    //     (authorizationFilter && options.filter
    //       ? nodeBuilder.and([esKuery.fromKueryExpression(options.filter), authorizationFilter])
    //       : authorizationFilter) ?? options.filter,
    //   fields: fields ? this.includeFieldsRequiredForAuthentication(fields) : fields,
    //   type: 'alert',
    // });
    // const authorizedData = data.map(({ id, attributes, references }) => {
    //   try {
    //     ensureAlertTypeIsAuthorized(attributes.alertTypeId, attributes.consumer);
    //   } catch (error) {
    //     this.auditLogger?.log(
    //       alertAuditEvent({
    //         action: AlertAuditAction.FIND,
    //         savedObject: { type: 'alert', id },
    //         error,
    //       })
    //     );
    //     throw error;
    //   }
    //   return this.getAlertFromRaw<Params>(
    //     id,
    //     fields ? (pick(attributes, fields) as RawAlert) : attributes,
    //     references
    //   );
    // });
    // authorizedData.forEach(({ id }) =>
    //   this.auditLogger?.log(
    //     alertAuditEvent({
    //       action: AlertAuditAction.FIND,
    //       savedObject: { type: 'alert', id },
    //     })
    //   )
    // );
    // logSuccessfulAuthorization();
    // return {
    //   page,
    //   perPage,
    //   total,
    //   data: authorizedData,
    // };
  }

  public async update<Params extends AlertTypeParams = never>({
    id,
    data,
  }: UpdateOptions<Params>): Promise<PartialAlert<Params>> {
    // return await retryIfConflicts(
    //   this.logger,
    //   `alertsClient.update('${id}')`,
    //   async () => await this.updateWithOCC<Params>({ id, data })
    // );
  }

  private async updateWithOCC<Params extends AlertTypeParams>({
    id,
    data,
  }: UpdateOptions<Params>): Promise<PartialAlert<Params>> {
    // let alertSavedObject: SavedObject<RawAlert>;
    // try {
    //   alertSavedObject = await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawAlert>(
    //     'alert',
    //     id,
    //     { namespace: this.namespace }
    //   );
    // } catch (e) {
    //   // We'll skip invalidating the API key since we failed to load the decrypted saved object
    //   this.logger.error(
    //     `update(): Failed to load API key to invalidate on alert ${id}: ${e.message}`
    //   );
    //   // Still attempt to load the object using SOC
    //   alertSavedObject = await this.unsecuredSavedObjectsClient.get<RawAlert>('alert', id);
    // }
    // try {
    //   await this.authorization.ensureAuthorized(
    //     alertSavedObject.attributes.alertTypeId,
    //     alertSavedObject.attributes.consumer,
    //     WriteOperations.Update
    //   );
    // } catch (error) {
    //   this.auditLogger?.log(
    //     alertAuditEvent({
    //       action: AlertAuditAction.UPDATE,
    //       savedObject: { type: 'alert', id },
    //       error,
    //     })
    //   );
    //   throw error;
    // }
    // this.auditLogger?.log(
    //   alertAuditEvent({
    //     action: AlertAuditAction.UPDATE,
    //     outcome: EventOutcome.UNKNOWN,
    //     savedObject: { type: 'alert', id },
    //   })
    // );
    // this.alertTypeRegistry.ensureAlertTypeEnabled(alertSavedObject.attributes.alertTypeId);
    // const updateResult = await this.updateAlert<Params>({ id, data }, alertSavedObject);
    // await Promise.all([
    //   alertSavedObject.attributes.apiKey
    //     ? markApiKeyForInvalidation(
    //         { apiKey: alertSavedObject.attributes.apiKey },
    //         this.logger,
    //         this.unsecuredSavedObjectsClient
    //       )
    //     : null,
    //   (async () => {
    //     if (
    //       updateResult.scheduledTaskId &&
    //       !isEqual(alertSavedObject.attributes.schedule, updateResult.schedule)
    //     ) {
    //       this.taskManager
    //         .runNow(updateResult.scheduledTaskId)
    //         .then(() => {
    //           this.logger.debug(
    //             `Alert update has rescheduled the underlying task: ${updateResult.scheduledTaskId}`
    //           );
    //         })
    //         .catch((err: Error) => {
    //           this.logger.error(
    //             `Alert update failed to run its underlying task. TaskManager runNow failed with Error: ${err.message}`
    //           );
    //         });
    //     }
    //   })(),
    // ]);
    // return updateResult;
  }
}
