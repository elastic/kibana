/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { KibanaRequest } from 'src/core/server';
import { SecurityPluginSetup } from '../../../security/server';
import { ActionsAuthorizationAuditLogger } from './audit_logger';
import { ACTION_SAVED_OBJECT_TYPE, ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE } from '../saved_objects';
import { SecurityLicense } from '../../../security/common/licensing';

export interface ConstructorOptions {
  request: KibanaRequest;
  auditLogger: ActionsAuthorizationAuditLogger;
  authorization?: SecurityPluginSetup['authz'];
  securityLicense?: SecurityLicense;
}

const operationAlias: Record<
  string,
  (authorization: SecurityPluginSetup['authz']) => string | string[]
> = {
  execute: (authorization) => [
    authorization.actions.savedObject.get(ACTION_SAVED_OBJECT_TYPE, 'get'),
    authorization.actions.savedObject.get(ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE, 'create'),
  ],
  list: (authorization) => authorization.actions.savedObject.get(ACTION_SAVED_OBJECT_TYPE, 'get'),
};

export class ActionsAuthorization {
  private readonly request: KibanaRequest;
  private readonly authorization?: SecurityPluginSetup['authz'];
  private readonly securityLicense?: SecurityLicense;
  private readonly auditLogger: ActionsAuthorizationAuditLogger;

  constructor({ request, authorization, securityLicense, auditLogger }: ConstructorOptions) {
    this.request = request;
    this.authorization = authorization;
    this.securityLicense = securityLicense;
    this.auditLogger = auditLogger;
  }

  public async ensureAuthorized(operation: string, actionTypeId?: string) {
    const { authorization, securityLicense } = this;
    if (authorization && securityLicense?.isEnabled()) {
      const checkPrivileges = authorization.checkPrivilegesDynamicallyWithRequest(this.request);
      const { hasAllRequested, username } = await checkPrivileges(
        operationAlias[operation]
          ? operationAlias[operation](authorization)
          : authorization.actions.savedObject.get(ACTION_SAVED_OBJECT_TYPE, operation)
      );
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
