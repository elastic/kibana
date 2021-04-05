/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'kibana/server';
import Boom from '@hapi/boom';
import { SecurityPluginStart } from '../../../security/server';
import { PluginStartContract as FeaturesPluginStart } from '../../../features/server';
import { AuthorizationFilter, GetSpaceFn } from './types';
import { getOwnersFilter } from './utils';
import { AuthorizationAuditLogger, OperationDetails, Operations } from '.';

/**
 * This class handles ensuring that the user making a request has the correct permissions
 * for the API request.
 */
export class Authorization {
  private readonly request: KibanaRequest;
  private readonly securityAuth: SecurityPluginStart['authz'] | undefined;
  private readonly featureCaseOwners: Set<string>;
  private readonly auditLogger: AuthorizationAuditLogger;

  private constructor({
    request,
    securityAuth,
    caseOwners,
    auditLogger,
  }: {
    request: KibanaRequest;
    securityAuth?: SecurityPluginStart['authz'];
    caseOwners: Set<string>;
    auditLogger: AuthorizationAuditLogger;
  }) {
    this.request = request;
    this.securityAuth = securityAuth;
    this.featureCaseOwners = caseOwners;
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
    let caseOwners: Set<string>;
    try {
      const disabledFeatures = new Set((await getSpace(request))?.disabledFeatures ?? []);

      caseOwners = new Set(
        features
          .getKibanaFeatures()
          // get all the features' cases owners that aren't disabled
          .filter(({ id }) => !disabledFeatures.has(id))
          .flatMap((feature) => feature.cases ?? [])
      );
    } catch (error) {
      caseOwners = new Set<string>();
    }

    return new Authorization({ request, securityAuth, caseOwners, auditLogger });
  }

  private shouldCheckAuthorization(): boolean {
    return this.securityAuth?.mode?.useRbacForRequest(this.request) ?? false;
  }

  public async ensureAuthorized(owner: string, operation: OperationDetails) {
    const { securityAuth } = this;
    const isOwnerAvailable = this.featureCaseOwners.has(owner);

    if (securityAuth && this.shouldCheckAuthorization()) {
      const requiredPrivileges: string[] = [securityAuth.actions.cases.get(owner, operation.name)];

      const checkPrivileges = securityAuth.checkPrivilegesDynamicallyWithRequest(this.request);
      const { hasAllRequested, username } = await checkPrivileges({
        kibana: requiredPrivileges,
      });

      if (!isOwnerAvailable) {
        /**
         * Under most circumstances this would have been caught by `checkPrivileges` as
         * a user can't have Privileges to an unknown owner, but super users
         * don't actually get "privilege checked" so the made up owner *will* return
         * as Privileged.
         * This check will ensure we don't accidentally let these through
         */
        throw Boom.forbidden(this.auditLogger.failure({ username, owner, operation }));
      }

      if (hasAllRequested) {
        this.auditLogger.success({ username, operation, owner });
      } else {
        throw Boom.forbidden(this.auditLogger.failure({ owner, operation, username }));
      }
    } else if (!isOwnerAvailable) {
      throw Boom.forbidden(this.auditLogger.failure({ owner, operation }));
    }

    // else security is disabled so let the operation proceed
  }

  public async getFindAuthorizationFilter(savedObjectType: string): Promise<AuthorizationFilter> {
    const { securityAuth } = this;
    const operation = Operations.findCases;
    if (securityAuth && this.shouldCheckAuthorization()) {
      const { username, authorizedOwners } = await this.getAuthorizedOwners([operation]);

      if (!authorizedOwners.length) {
        throw Boom.forbidden(this.auditLogger.failure({ username, operation }));
      }

      return {
        filter: getOwnersFilter(savedObjectType, authorizedOwners),
        ensureSavedObjectIsAuthorized: (owner: string) => {
          if (!authorizedOwners.includes(owner)) {
            throw Boom.forbidden(this.auditLogger.failure({ username, operation, owner }));
          }
        },
        logSuccessfulAuthorization: () => {
          if (authorizedOwners.length) {
            this.auditLogger.bulkSuccess({ username, owners: authorizedOwners, operation });
          }
        },
      };
    }

    return {
      ensureSavedObjectIsAuthorized: (owner: string) => {},
      logSuccessfulAuthorization: () => {},
    };
  }

  private async getAuthorizedOwners(
    operations: OperationDetails[]
  ): Promise<{
    username?: string;
    hasAllRequested: boolean;
    authorizedOwners: string[];
  }> {
    const { securityAuth, featureCaseOwners } = this;
    if (securityAuth && this.shouldCheckAuthorization()) {
      const checkPrivileges = securityAuth.checkPrivilegesDynamicallyWithRequest(this.request);
      const requiredPrivileges = new Map<string, [string]>();

      for (const owner of featureCaseOwners) {
        for (const operation of operations) {
          requiredPrivileges.set(securityAuth.actions.cases.get(owner, operation.name), [owner]);
        }
      }

      const { hasAllRequested, username, privileges } = await checkPrivileges({
        kibana: [...requiredPrivileges.keys()],
      });

      return {
        hasAllRequested,
        username,
        authorizedOwners: hasAllRequested
          ? Array.from(featureCaseOwners)
          : privileges.kibana.reduce<string[]>((authorizedOwners, { authorized, privilege }) => {
              if (authorized && requiredPrivileges.has(privilege)) {
                const [owner] = requiredPrivileges.get(privilege)!;
                authorizedOwners.push(owner);
              }

              return authorizedOwners;
            }, []),
      };
    } else {
      return {
        hasAllRequested: true,
        authorizedOwners: Array.from(featureCaseOwners),
      };
    }
  }
}
