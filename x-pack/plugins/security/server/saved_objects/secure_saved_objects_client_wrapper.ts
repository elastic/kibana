/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsPredicate } from 'src/core/server/saved_objects';
import { isString } from 'util';
import {
  SavedObjectAttributes,
  SavedObjectsBaseOptions,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkGetObject,
  SavedObjectsBulkUpdateObject,
  SavedObjectsClientContract,
  SavedObjectsCreateOptions,
  SavedObjectsFindOptions,
  SavedObjectsUpdateOptions,
} from '../../../../../src/core/server';
import { SecurityAuditLogger } from '../audit';
import { Actions, CheckSavedObjectsPrivileges } from '../authorization';
import { SavedObjectsPrivileges } from './saved_objects_privileges';
import { SavedObjectCondition } from '../../../features/server/feature_kibana_privileges';

interface SecureSavedObjectsClientWrapperOptions {
  actions: Actions;
  auditLogger: SecurityAuditLogger;
  baseClient: SavedObjectsClientContract;
  errors: SavedObjectsClientContract['errors'];
  checkSavedObjectsPrivilegesAsCurrentUser: CheckSavedObjectsPrivileges;
  savedObjectsPrivileges: SavedObjectsPrivileges;
}

interface EnsureAuthorizedResult {
  predicates?: SavedObjectsPredicate[];
}

export class SecureSavedObjectsClientWrapper implements SavedObjectsClientContract {
  private readonly actions: Actions;
  private readonly auditLogger: PublicMethodsOf<SecurityAuditLogger>;
  private readonly baseClient: SavedObjectsClientContract;
  private readonly checkSavedObjectsPrivilegesAsCurrentUser: CheckSavedObjectsPrivileges;
  public readonly errors: SavedObjectsClientContract['errors'];
  private readonly savedObjectsPrivileges: SavedObjectsPrivileges;
  constructor({
    actions,
    auditLogger,
    baseClient,
    checkSavedObjectsPrivilegesAsCurrentUser,
    errors,
    savedObjectsPrivileges,
  }: SecureSavedObjectsClientWrapperOptions) {
    this.errors = errors;
    this.actions = actions;
    this.auditLogger = auditLogger;
    this.baseClient = baseClient;
    this.checkSavedObjectsPrivilegesAsCurrentUser = checkSavedObjectsPrivilegesAsCurrentUser;
    this.savedObjectsPrivileges = savedObjectsPrivileges;
  }

  public async create<T extends SavedObjectAttributes>(
    type: string,
    attributes: T = {} as T,
    options: SavedObjectsCreateOptions = {}
  ) {
    const { predicates } = await this.ensureAuthorized(type, 'create', options.namespace, {
      type,
      attributes,
      options,
    });
    options.predicates = predicates;
    return await this.baseClient.create(type, attributes, options);
  }

  public async bulkCreate(
    objects: SavedObjectsBulkCreateObject[],
    options: SavedObjectsBaseOptions = {}
  ) {
    await this.ensureAuthorized(
      this.getUniqueObjectTypes(objects),
      'bulk_create',
      options.namespace,
      { objects, options }
    );

    return await this.baseClient.bulkCreate(objects, options);
  }

  public async delete(type: string, id: string, options: SavedObjectsBaseOptions = {}) {
    await this.ensureAuthorized(type, 'delete', options.namespace, { type, id, options });

    return await this.baseClient.delete(type, id, options);
  }

  public async find(options: SavedObjectsFindOptions) {
    await this.ensureAuthorized(options.type, 'find', options.namespace, { options });

    return this.baseClient.find(options);
  }

  public async bulkGet(
    objects: SavedObjectsBulkGetObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ) {
    await this.ensureAuthorized(this.getUniqueObjectTypes(objects), 'bulk_get', options.namespace, {
      objects,
      options,
    });

    return await this.baseClient.bulkGet(objects, options);
  }

  public async get(type: string, id: string, options: SavedObjectsBaseOptions = {}) {
    await this.ensureAuthorized(type, 'get', options.namespace, { type, id, options });

    return await this.baseClient.get(type, id, options);
  }

  public async update<T extends SavedObjectAttributes>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options: SavedObjectsUpdateOptions = {}
  ) {
    await this.ensureAuthorized(type, 'update', options.namespace, {
      type,
      id,
      attributes,
      options,
    });

    return await this.baseClient.update(type, id, attributes, options);
  }

  public async bulkUpdate(
    objects: SavedObjectsBulkUpdateObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ) {
    await this.ensureAuthorized(
      this.getUniqueObjectTypes(objects),
      'bulk_update',
      options && options.namespace,
      { objects, options }
    );

    return await this.baseClient.bulkUpdate(objects, options);
  }

  private async checkPrivileges(actions: string | string[], namespace?: string) {
    try {
      return await this.checkSavedObjectsPrivilegesAsCurrentUser(actions, namespace);
    } catch (error) {
      throw this.errors.decorateGeneralError(error, error.body && error.body.reason);
    }
  }

  private async ensureAuthorized(
    typeOrTypes: string | string[],
    action: string,
    namespace?: string,
    args?: Record<string, unknown>
  ): Promise<EnsureAuthorizedResult> {
    const types = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes];
    const actionsMap = new Map<string, string | SavedObjectsPredicate>();
    for (const type of types) {
      if (this.savedObjectsPrivileges.hasConditionalPrivileges(type)) {
        const conditions = this.savedObjectsPrivileges.getConditions(type);
        for (const condition of conditions) {
          actionsMap.set(this.actions.savedObject.get({ type, when: condition }, action), {
            type,
            when: condition,
          });
        }
      } else {
        actionsMap.set(this.actions.savedObject.get(type, action), type);
      }
    }
    const actions = Array.from(actionsMap.keys());
    const { username, privileges } = await this.checkPrivileges(actions, namespace);

    const predicates: SavedObjectsPredicate[] = [];
    let forbidden = false;
    const missingPrivileges: string[] = [];
    for (const [privilege, result] of Object.entries(privileges)) {
      const typeOrCondition = actionsMap.get(privilege)!;
      if (isString(typeOrCondition)) {
        if (result === false) {
          forbidden = true;
          missingPrivileges.push(privilege);
        }
      } else {
        if (result === true) {
          predicates.push(typeOrCondition);
        }
      }
    }

    if (!forbidden) {
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
        .map(privilege => actionsMap.get(privilege))
        .sort()
        .join(',')}`;
      throw this.errors.decorateForbiddenError(new Error(msg));
    }

    return {
      predicates,
    };
  }

  private getMissingPrivileges(privileges: Record<string, boolean>) {
    return Object.keys(privileges).filter(privilege => !privileges[privilege]);
  }

  private getUniqueObjectTypes(objects: Array<{ type: string }>) {
    return [...new Set(objects.map(o => o.type))];
  }
}
