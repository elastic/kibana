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
import { AuthorizationFilter, AuthorizationValidator, GetSpaceFn } from './types';
import { getOwnersFilter } from './utils';
import { AuthorizationAuditLogger, OperationDetails } from '.';

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

  public async getAuthorizationValidator(
    owners: string[],
    operation: OperationDetails
  ): Promise<AuthorizationValidator> {
    const { securityAuth } = this;
    const isOwnerAvailable = owners.every((owner) => this.featureCaseOwners.has(owner));

    if (securityAuth && this.shouldCheckAuthorization()) {
      const { username, authorizedOwners } = await this.getAuthorizedOwners(
        new Set<string>(owners),
        [operation]
      );

      if (!isOwnerAvailable) {
        /**
         * Under most circumstances this would have been caught by `checkPrivileges` as
         * a user can't have Privileges to an unknown owner, but super users
         * don't actually get "privilege checked" so the made up owner *will* return
         * as Privileged.
         * This check will ensure we don't accidentally let these through
         */
        throw Boom.forbidden(this.auditLogger.failure({ username, owners, operation }));
      }

      return {
        ensureSavedObjectIsAuthorized: (owner: string) => {
          if (!authorizedOwners) {
            throw Boom.forbidden(
              this.auditLogger.failure({ username, operation, owners: [owner] })
            );
          }
        },
      };
    } else if (!isOwnerAvailable) {
      throw Boom.forbidden(this.auditLogger.failure({ owners, operation }));
    }

    // else security is disabled so let the operation proceed
    return {
      ensureSavedObjectIsAuthorized: (owner: string) => {},
    };
  }

  public async getFindAuthorizationFilter(
    operation: OperationDetails
  ): Promise<AuthorizationFilter> {
    const { securityAuth, featureCaseOwners } = this;
    if (securityAuth && this.shouldCheckAuthorization()) {
      const { username, authorizedOwners } = await this.getAuthorizedOwners(featureCaseOwners, [
        operation,
      ]);

      if (!authorizedOwners.length) {
        throw Boom.forbidden(this.auditLogger.failure({ username, operation }));
      }

      return {
        filter: getOwnersFilter(operation.savedObjectType, authorizedOwners),
        ensureSavedObjectIsAuthorized: (owner: string) => {
          if (!authorizedOwners.includes(owner)) {
            throw Boom.forbidden(
              this.auditLogger.failure({ username, operation, owners: [owner] })
            );
          }
        },
        logSuccessfulAuthorization: () => {
          if (authorizedOwners.length) {
            this.auditLogger.success({ username, owners: authorizedOwners, operation });
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
    owners: Set<string>,
    operations: OperationDetails[]
  ): Promise<{
    username?: string;
    hasAllRequested: boolean;
    authorizedOwners: string[];
  }> {
    const { securityAuth } = this;
    if (securityAuth && this.shouldCheckAuthorization()) {
      const checkPrivileges = securityAuth.checkPrivilegesDynamicallyWithRequest(this.request);
      const requiredPrivileges = new Map<string, string>();

      for (const owner of owners) {
        for (const operation of operations) {
          requiredPrivileges.set(securityAuth.actions.cases.get(owner, operation.name), owner);
        }
      }

      const { hasAllRequested, username, privileges } = await checkPrivileges({
        kibana: [...requiredPrivileges.keys()],
      });

      return {
        hasAllRequested,
        username,
        authorizedOwners: hasAllRequested
          ? Array.from(owners)
          : privileges.kibana.reduce<string[]>((authorizedOwners, { authorized, privilege }) => {
              if (authorized && requiredPrivileges.has(privilege)) {
                const owner = requiredPrivileges.get(privilege)!;
                authorizedOwners.push(owner);
              }

              return authorizedOwners;
            }, []),
      };
    } else {
      return {
        hasAllRequested: true,
        authorizedOwners: Array.from(owners),
      };
    }
  }
}
