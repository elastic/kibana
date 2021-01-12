/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { KibanaRequest } from 'src/core/server';
import { SecurityPluginSetup } from '../../../security/server';
import { ActionsAuthorizationAuditLogger } from './audit_logger';
import { ACTION_SAVED_OBJECT_TYPE, ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE } from '../saved_objects';
import { AuthorizationMode } from './get_authorization_mode_by_source';

export interface ConstructorOptions {
  request: KibanaRequest;
  auditLogger: ActionsAuthorizationAuditLogger;
  authorization?: SecurityPluginSetup['authz'];
  authentication?: SecurityPluginSetup['authc'];
  // In order to support legacy Alerts which predate the introduction of the
  // Actions feature in Kibana we need a way of "dialing down" the level of
  // authorization for certain opearations.
  // Specifically, we want to allow these old alerts and their scheduled
  // actions to continue to execute - which requires that we exempt auth on
  // `get` for Connectors and `execute` for Action execution when used by
  // these legacy alerts
  authorizationMode?: AuthorizationMode;
}

const operationAlias: Record<
  string,
  (authorization: SecurityPluginSetup['authz']) => string | string[]
> = {
  execute: (authorization) => [
    authorization.actions.savedObject.get(ACTION_SAVED_OBJECT_TYPE, 'get'),
    authorization.actions.savedObject.get(ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE, 'create'),
  ],
  list: (authorization) => authorization.actions.savedObject.get(ACTION_SAVED_OBJECT_TYPE, 'find'),
};

const LEGACY_RBAC_EXEMPT_OPERATIONS = new Set(['get', 'execute']);

export class ActionsAuthorization {
  private readonly request: KibanaRequest;
  private readonly authorization?: SecurityPluginSetup['authz'];
  private readonly authentication?: SecurityPluginSetup['authc'];
  private readonly auditLogger: ActionsAuthorizationAuditLogger;
  private readonly authorizationMode: AuthorizationMode;
  constructor({
    request,
    authorization,
    authentication,
    auditLogger,
    authorizationMode = AuthorizationMode.RBAC,
  }: ConstructorOptions) {
    this.request = request;
    this.authorization = authorization;
    this.authentication = authentication;
    this.auditLogger = auditLogger;
    this.authorizationMode = authorizationMode;
  }

  public async ensureAuthorized(operation: string, actionTypeId?: string) {
    const { authorization } = this;
    if (authorization?.mode?.useRbacForRequest(this.request)) {
      if (this.isOperationExemptDueToLegacyRbac(operation)) {
        this.auditLogger.actionsAuthorizationSuccess(
          this.authentication?.getCurrentUser(this.request)?.username ?? '',
          operation,
          actionTypeId
        );
      } else {
        const checkPrivileges = authorization.checkPrivilegesDynamicallyWithRequest(this.request);
        const { hasAllRequested, username } = await checkPrivileges({
          kibana: operationAlias[operation]
            ? operationAlias[operation](authorization)
            : authorization.actions.savedObject.get(ACTION_SAVED_OBJECT_TYPE, operation),
        });
        if (hasAllRequested) {
          this.auditLogger.actionsAuthorizationSuccess(username, operation, actionTypeId);
        } else {
          throw Boom.forbidden(
            this.auditLogger.actionsAuthorizationFailure(username, operation, actionTypeId)
          );
        }
      }
    }
  }

  private isOperationExemptDueToLegacyRbac(operation: string) {
    return (
      this.authorizationMode === AuthorizationMode.Legacy &&
      LEGACY_RBAC_EXEMPT_OPERATIONS.has(operation)
    );
  }
}
