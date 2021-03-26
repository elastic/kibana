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
import { GetSpaceFn, ReadOperations, WriteOperations } from './types';
import { getScopesFilter } from './utils';

/**
 * This class handles ensuring that the user making a request has the correct permissions
 * for the API request.
 */
export class Authorization {
  private readonly request: KibanaRequest;
  private readonly securityAuth: SecurityPluginStart['authz'] | undefined;
  private readonly featureCaseScopes: Set<string>;
  private readonly isAuthEnabled: boolean;
  // TODO: create this
  // private readonly auditLogger: AuthorizationAuditLogger;

  private constructor({
    request,
    securityAuth,
    caseScopes,
    isAuthEnabled,
  }: {
    request: KibanaRequest;
    securityAuth?: SecurityPluginStart['authz'];
    caseScopes: Set<string>;
    isAuthEnabled: boolean;
  }) {
    this.request = request;
    this.securityAuth = securityAuth;
    this.featureCaseScopes = caseScopes;
    this.isAuthEnabled = isAuthEnabled;
  }

  /**
   * Creates an Authorization object.
   */
  static async create({
    request,
    securityAuth,
    getSpace,
    features,
    isAuthEnabled,
  }: {
    request: KibanaRequest;
    securityAuth?: SecurityPluginStart['authz'];
    getSpace: GetSpaceFn;
    features: FeaturesPluginStart;
    isAuthEnabled: boolean;
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

    return new Authorization({ request, securityAuth, caseScopes, isAuthEnabled });
  }

  private shouldCheckAuthorization(): boolean {
    return this.securityAuth?.mode?.useRbacForRequest(this.request) ?? false;
  }

  public async ensureAuthorized(scope: string, operation: ReadOperations | WriteOperations) {
    // TODO: remove
    if (!this.isAuthEnabled) {
      return;
    }

    const { securityAuth } = this;
    const isScopeAvailable = this.featureCaseScopes.has(scope);

    // TODO: throw if the request is not authorized
    if (securityAuth && this.shouldCheckAuthorization()) {
      // TODO: implement ensure logic
      const requiredPrivileges: string[] = [securityAuth.actions.cases.get(scope, operation)];

      const checkPrivileges = securityAuth.checkPrivilegesDynamicallyWithRequest(this.request);
      const { hasAllRequested, username, privileges } = await checkPrivileges({
        kibana: requiredPrivileges,
      });

      if (!isScopeAvailable) {
        // TODO: throw if any of the scope are not available
        /**
         * Under most circumstances this would have been caught by `checkPrivileges` as
         * a user can't have Privileges to an unknown scope, but super users
         * don't actually get "privilege checked" so the made up scope *will* return
         * as Privileged.
         * This check will ensure we don't accidentally let these through
         */
        // TODO: audit log using `username`
        throw Boom.forbidden('User does not have permissions for this scope');
      }

      if (hasAllRequested) {
        // TODO: user authorized. log success
      } else {
        const authorizedPrivileges = privileges.kibana.reduce<string[]>((acc, privilege) => {
          if (privilege.authorized) {
            return [...acc, privilege.privilege];
          }
          return acc;
        }, []);

        const unauthorizedPrivilages = requiredPrivileges.filter(
          (privilege) => !authorizedPrivileges.includes(privilege)
        );

        // TODO: audit log
        // TODO: User unauthorized. throw an error. authorizedPrivileges & unauthorizedPrivilages are needed for logging.
        throw Boom.forbidden('Not authorized for this scope');
      }
    } else if (!isScopeAvailable) {
      // TODO: throw an error
      throw Boom.forbidden('Security is disabled but no scope was found');
    }

    // else security is disabled so let the operation proceed
  }

  public async getFindAuthorizationFilter(
    savedObjectType: string
  ): Promise<{
    filter?: KueryNode;
    ensureSavedObjectIsAuthorized: (scope: string) => void;
  }> {
    const { securityAuth } = this;
    if (securityAuth && this.shouldCheckAuthorization()) {
      const { authorizedScopes } = await this.getAuthorizedScopes([ReadOperations.Find]);

      if (!authorizedScopes.length) {
        // TODO: Better error message, log error
        throw Boom.forbidden('Not authorized for this scope');
      }

      return {
        filter: getScopesFilter(savedObjectType, authorizedScopes),
        ensureSavedObjectIsAuthorized: (scope: string) => {
          if (!authorizedScopes.includes(scope)) {
            // TODO: log error
            throw Boom.forbidden('Not authorized for this scope');
          }
        },
      };
    }

    return { ensureSavedObjectIsAuthorized: (scope: string) => {} };
  }

  private async getAuthorizedScopes(
    operations: Array<ReadOperations | WriteOperations>
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
          requiredPrivileges.set(securityAuth.actions.cases.get(scope, operation), [scope]);
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
