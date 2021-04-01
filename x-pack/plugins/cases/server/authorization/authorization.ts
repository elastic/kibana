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
import { getOwnersFilter } from './utils';

/**
 * This class handles ensuring that the user making a request has the correct permissions
 * for the API request.
 */
export class Authorization {
  private readonly request: KibanaRequest;
  private readonly securityAuth: SecurityPluginStart['authz'] | undefined;
  private readonly featureCaseOwners: Set<string>;
  private readonly isAuthEnabled: boolean;
  // TODO: create this
  // private readonly auditLogger: AuthorizationAuditLogger;

  private constructor({
    request,
    securityAuth,
    caseOwners,
    isAuthEnabled,
  }: {
    request: KibanaRequest;
    securityAuth?: SecurityPluginStart['authz'];
    caseOwners: Set<string>;
    isAuthEnabled: boolean;
  }) {
    this.request = request;
    this.securityAuth = securityAuth;
    this.featureCaseOwners = caseOwners;
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

    return new Authorization({ request, securityAuth, caseOwners, isAuthEnabled });
  }

  private shouldCheckAuthorization(): boolean {
    return this.securityAuth?.mode?.useRbacForRequest(this.request) ?? false;
  }

  public async ensureAuthorized(owner: string, operation: ReadOperations | WriteOperations) {
    // TODO: remove
    if (!this.isAuthEnabled) {
      return;
    }

    const { securityAuth } = this;
    const isOwnerAvailable = this.featureCaseOwners.has(owner);

    // TODO: throw if the request is not authorized
    if (securityAuth && this.shouldCheckAuthorization()) {
      // TODO: implement ensure logic
      const requiredPrivileges: string[] = [securityAuth.actions.cases.get(owner, operation)];

      const checkPrivileges = securityAuth.checkPrivilegesDynamicallyWithRequest(this.request);
      const { hasAllRequested, username, privileges } = await checkPrivileges({
        kibana: requiredPrivileges,
      });

      if (!isOwnerAvailable) {
        // TODO: throw if any of the owner are not available
        /**
         * Under most circumstances this would have been caught by `checkPrivileges` as
         * a user can't have Privileges to an unknown owner, but super users
         * don't actually get "privilege checked" so the made up owner *will* return
         * as Privileged.
         * This check will ensure we don't accidentally let these through
         */
        // TODO: audit log using `username`
        throw Boom.forbidden('User does not have permissions for this owner');
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
        throw Boom.forbidden('Not authorized for this owner');
      }
    } else if (!isOwnerAvailable) {
      // TODO: throw an error
      throw Boom.forbidden('Security is disabled but no owner was found');
    }

    // else security is disabled so let the operation proceed
  }

  public async getFindAuthorizationFilter(
    savedObjectType: string
  ): Promise<{
    filter?: KueryNode;
    ensureSavedObjectIsAuthorized: (owner: string) => void;
  }> {
    const { securityAuth } = this;
    if (securityAuth && this.shouldCheckAuthorization()) {
      const { authorizedOwners } = await this.getAuthorizedOwners([ReadOperations.Find]);

      if (!authorizedOwners.length) {
        // TODO: Better error message, log error
        throw Boom.forbidden('Not authorized for this owner');
      }

      return {
        filter: getOwnersFilter(savedObjectType, authorizedOwners),
        ensureSavedObjectIsAuthorized: (owner: string) => {
          if (!authorizedOwners.includes(owner)) {
            // TODO: log error
            throw Boom.forbidden('Not authorized for this owner');
          }
        },
      };
    }

    return { ensureSavedObjectIsAuthorized: (owner: string) => {} };
  }

  private async getAuthorizedOwners(
    operations: Array<ReadOperations | WriteOperations>
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
          requiredPrivileges.set(securityAuth.actions.cases.get(owner, operation), [owner]);
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
