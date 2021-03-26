/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'kibana/server';
import Boom from '@hapi/boom';
import { KueryNode } from '../../../../../src/plugins/data/server';
import { SecurityPluginStart } from '../../../security/server';
import { PluginStartContract as FeaturesPluginStart } from '../../../features/server';
import { GetSpaceFn } from './types';
import { getScopesFilter } from './utils';
import { AuthorizationAuditLogger, OperationDetails, Operations } from '.';

/**
 * This class handles ensuring that the user making a request has the correct permissions
 * for the API request.
 */
export class Authorization {
  private readonly request: KibanaRequest;
  private readonly securityAuth: SecurityPluginStart['authz'] | undefined;
  private readonly featureCaseScopes: Set<string>;
  private readonly auditLogger: AuthorizationAuditLogger;

  private constructor({
    request,
    securityAuth,
    caseScopes,
    auditLogger,
  }: {
    request: KibanaRequest;
    securityAuth?: SecurityPluginStart['authz'];
    caseScopes: Set<string>;
    auditLogger: AuthorizationAuditLogger;
  }) {
    this.request = request;
    this.securityAuth = securityAuth;
    this.featureCaseScopes = caseScopes;
    this.auditLogger = auditLogger;
  }

  /**
   * Creates an Authorization object.
   */
  static async create({
    request,
    securityAuth,
    getSpace,
    features,
    auditLogger,
  }: {
    request: KibanaRequest;
    securityAuth?: SecurityPluginStart['authz'];
    getSpace: GetSpaceFn;
    features: FeaturesPluginStart;
    auditLogger: AuthorizationAuditLogger;
  }): Promise<Authorization> {
    // Since we need to do async operations, this static method handles that before creating the Auth class
    let caseScopes: Set<string>;
    try {
      const disabledFeatures = new Set((await getSpace(request))?.disabledFeatures ?? []);

      caseScopes = new Set(
        features
          .getKibanaFeatures()
          // get all the features' cases scopes that aren't disabled
          .filter(({ id }) => !disabledFeatures.has(id))
          .flatMap((feature) => feature.cases ?? [])
      );
    } catch (error) {
      caseScopes = new Set<string>();
    }

    return new Authorization({ request, securityAuth, caseScopes, auditLogger });
  }

  private shouldCheckAuthorization(): boolean {
    return this.securityAuth?.mode?.useRbacForRequest(this.request) ?? false;
  }

  public async ensureAuthorized(scope: string, operation: OperationDetails) {
    const { securityAuth } = this;
    const isScopeAvailable = this.featureCaseScopes.has(scope);

    if (securityAuth && this.shouldCheckAuthorization()) {
      const requiredPrivileges: string[] = [securityAuth.actions.cases.get(scope, operation.name)];

      const checkPrivileges = securityAuth.checkPrivilegesDynamicallyWithRequest(this.request);
      const { hasAllRequested, username } = await checkPrivileges({
        kibana: requiredPrivileges,
      });

      if (!isScopeAvailable) {
        /**
         * Under most circumstances this would have been caught by `checkPrivileges` as
         * a user can't have Privileges to an unknown scope, but super users
         * don't actually get "privilege checked" so the made up scope *will* return
         * as Privileged.
         * This check will ensure we don't accidentally let these through
         */
        throw Boom.forbidden(this.auditLogger.failure({ username, scope, operation }));
      }

      if (hasAllRequested) {
        this.auditLogger.success({ username, operation, scope });
      } else {
        throw Boom.forbidden(this.auditLogger.failure({ scope, operation, username }));
      }
    } else if (!isScopeAvailable) {
      throw Boom.forbidden(this.auditLogger.failure({ scope, operation }));
    }

    // else security is disabled so let the operation proceed
  }

  public async getFindAuthorizationFilter(
    savedObjectType: string
  ): Promise<{
    filter?: KueryNode;
    ensureSavedObjectIsAuthorized: (scope: string) => void;
    logSuccessfulAuthorization: () => void;
  }> {
    const { securityAuth } = this;
    const operation = Operations.findCases;
    if (securityAuth && this.shouldCheckAuthorization()) {
      const { username, authorizedScopes } = await this.getAuthorizedScopes([operation]);

      if (!authorizedScopes.length) {
        throw Boom.forbidden(this.auditLogger.failure({ username, operation }));
      }

      return {
        filter: getScopesFilter(savedObjectType, authorizedScopes),
        ensureSavedObjectIsAuthorized: (scope: string) => {
          if (!authorizedScopes.includes(scope)) {
            throw Boom.forbidden(this.auditLogger.failure({ username, operation, scope }));
          }
        },
        logSuccessfulAuthorization: () => {
          if (authorizedScopes.length) {
            this.auditLogger.bulkSuccess({ username, scopes: authorizedScopes, operation });
          }
        },
      };
    }

    return {
      ensureSavedObjectIsAuthorized: (scope: string) => {},
      logSuccessfulAuthorization: () => {},
    };
  }

  private async getAuthorizedScopes(
    operations: OperationDetails[]
  ): Promise<{
    username?: string;
    hasAllRequested: boolean;
    authorizedScopes: string[];
  }> {
    const { securityAuth, featureCaseScopes } = this;
    if (securityAuth && this.shouldCheckAuthorization()) {
      const checkPrivileges = securityAuth.checkPrivilegesDynamicallyWithRequest(this.request);
      const requiredPrivileges = new Map<string, [string]>();

      for (const scope of featureCaseScopes) {
        for (const operation of operations) {
          requiredPrivileges.set(securityAuth.actions.cases.get(scope, operation.name), [scope]);
        }
      }

      const { hasAllRequested, username, privileges } = await checkPrivileges({
        kibana: [...requiredPrivileges.keys()],
      });

      return {
        hasAllRequested,
        username,
        authorizedScopes: hasAllRequested
          ? Array.from(featureCaseScopes)
          : privileges.kibana.reduce<string[]>((authorizedScopes, { authorized, privilege }) => {
              if (authorized && requiredPrivileges.has(privilege)) {
                const [scope] = requiredPrivileges.get(privilege)!;
                authorizedScopes.push(scope);
              }

              return authorizedScopes;
            }, []),
      };
    } else {
      return {
        hasAllRequested: true,
        authorizedScopes: Array.from(featureCaseScopes),
      };
    }
  }
}
