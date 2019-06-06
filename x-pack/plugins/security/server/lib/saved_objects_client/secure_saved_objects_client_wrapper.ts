/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, uniq } from 'lodash';
import {
  SavedObjectsClientContract,
  CreateOptions,
  SavedObjectAttributes,
  BulkCreateObject,
  BaseOptions,
  FindOptions,
  BulkGetObject,
  FindResponse,
  BulkResponse,
  SavedObject,
  UpdateOptions,
} from 'src/legacy/server/saved_objects';
import { Legacy } from 'kibana';
import { Actions } from '../authorization';

export interface SecureSavedObjectsClientWrapperDeps {
  actions: any;
  auditLogger: any;
  baseClient: SavedObjectsClientContract;
  checkPrivilegesDynamicallyWithRequest: any;
  errors: any;
  request: Legacy.Request;
}

export class SecureSavedObjectsClientWrapper implements SavedObjectsClientContract {
  private actions: Actions;

  private auditLogger: any;

  private baseClient: SavedObjectsClientContract;

  private checkPrivileges: any;

  public errors: any;

  constructor(options: SecureSavedObjectsClientWrapperDeps) {
    const {
      actions,
      auditLogger,
      baseClient,
      checkPrivilegesDynamicallyWithRequest,
      errors,
      request,
    } = options;

    this.errors = errors;
    this.actions = actions;
    this.auditLogger = auditLogger;
    this.baseClient = baseClient;
    this.checkPrivileges = checkPrivilegesDynamicallyWithRequest(request);
  }

  public async create<T extends SavedObjectAttributes = any>(
    type: string,
    attributes: T,
    options: CreateOptions = {}
  ) {
    await this.ensureAuthorized(type, 'create', { type, attributes, options });

    return await this.baseClient.create(type, attributes, options);
  }

  public async bulkCreate<T extends SavedObjectAttributes = any>(
    objects: Array<BulkCreateObject<T>>,
    options: CreateOptions = {}
  ) {
    const types = uniq(objects.map(o => o.type));
    await this.ensureAuthorized(types, 'bulk_create', { objects, options });

    return await this.baseClient.bulkCreate(objects, options);
  }

  public async delete(type: string, id: string, options: BaseOptions = {}) {
    await this.ensureAuthorized(type, 'delete', { type, id, options });

    return await this.baseClient.delete(type, id, options);
  }

  public async find<T extends SavedObjectAttributes = any>(
    options: FindOptions = {}
  ): Promise<FindResponse<T>> {
    await this.ensureAuthorized(options.type, 'find', { options });

    return this.baseClient.find(options);
  }

  public async bulkGet<T extends SavedObjectAttributes = any>(
    objects: BulkGetObject[] = [],
    options: BaseOptions = {}
  ): Promise<BulkResponse<T>> {
    const types = uniq(objects.map(o => o.type));
    await this.ensureAuthorized(types, 'bulk_get', { objects, options });

    return await this.baseClient.bulkGet(objects, options);
  }

  public async get<T extends SavedObjectAttributes = any>(
    type: string,
    id: string,
    options: BaseOptions = {}
  ): Promise<SavedObject<T>> {
    await this.ensureAuthorized(type, 'get', { type, id, options });

    return await this.baseClient.get(type, id, options);
  }

  public async update<T extends SavedObjectAttributes = any>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options: UpdateOptions = {}
  ) {
    await this.ensureAuthorized(type, 'update', { type, id, attributes, options });

    return await this.baseClient.update(type, id, attributes, options);
  }

  private async checkSavedObjectPrivileges(actions: string[]) {
    try {
      return await this.checkPrivileges(actions);
    } catch (error) {
      const { reason } = get<Record<string, any>>(error, 'body.error', {});
      throw this.errors.decorateGeneralError(error, reason);
    }
  }

  private async ensureAuthorized(
    typeOrTypes: string | string[] | undefined,
    action: string,
    args: any
  ) {
    const types = this.coerceToArray(typeOrTypes);
    const actionsToTypesMap = new Map(
      types.map(type => [this.actions.savedObject.get(type, action), type] as [string, string])
    );
    const actions = Array.from(actionsToTypesMap.keys());
    const { hasAllRequested, username, privileges } = await this.checkSavedObjectPrivileges(
      actions
    );

    if (hasAllRequested) {
      this.auditLogger.savedObjectsAuthorizationSuccess(username, action, types, args);
    } else {
      const missingPrivileges = this.getMissingPrivileges(privileges);
      this.auditLogger.savedObjectsAuthorizationFailure(
        username,
        action,
        types,
        missingPrivileges,
        args
      );
      const msg = `Unable to ${action} ${missingPrivileges
        .map(privilege => actionsToTypesMap.get(privilege))
        .sort()
        .join(',')}`;
      throw this.errors.decorateForbiddenError(new Error(msg));
    }
  }

  private coerceToArray(typeOrTypes: string | string[] | undefined): string[] {
    if (!typeOrTypes) {
      return [];
    }
    return Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes];
  }

  private getMissingPrivileges(response: Record<string, boolean>) {
    return Object.keys(response).filter(privilege => !response[privilege]);
  }
}
