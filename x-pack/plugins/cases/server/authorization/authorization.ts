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
import { GetSpaceFn, ReadOperations, WriteOperations } from './types';

/**
 * This class handles ensuring that the user making a request has the correct permissions
 * for the API request.
 */
export class Authorization {
  private readonly request: KibanaRequest;
  private readonly securityAuth: SecurityPluginStart['authz'] | undefined;
  private readonly featureCaseClasses: Set<string>;
  private readonly isAuthEnabled: boolean;
  // TODO: create this
  // private readonly auditLogger: AuthorizationAuditLogger;

  private constructor({
    request,
    securityAuth,
    caseClasses,
    isAuthEnabled,
  }: {
    request: KibanaRequest;
    securityAuth?: SecurityPluginStart['authz'];
    caseClasses: Set<string>;
    isAuthEnabled: boolean;
  }) {
    this.request = request;
    this.securityAuth = securityAuth;
    this.featureCaseClasses = caseClasses;
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
    let caseClasses: Set<string>;
    try {
      const disabledFeatures = new Set((await getSpace(request))?.disabledFeatures ?? []);

      caseClasses = new Set(
        features
          .getKibanaFeatures()
          // get all the features' cases classes that aren't disabled
          .filter(({ id }) => !disabledFeatures.has(id))
          .flatMap((feature) => feature.cases ?? [])
      );
    } catch (error) {
      caseClasses = new Set<string>();
    }

    return new Authorization({ request, securityAuth, caseClasses, isAuthEnabled });
  }

  private shouldCheckAuthorization(): boolean {
    return this.securityAuth?.mode?.useRbacForRequest(this.request) ?? false;
  }

  public async ensureAuthorized(className: string, operation: ReadOperations | WriteOperations) {
    // TODO: remove
    if (!this.isAuthEnabled) {
      return;
    }

    const { securityAuth } = this;
    const isAvailableClass = this.featureCaseClasses.has(className);

    // TODO: throw if the request is not authorized
    if (securityAuth && this.shouldCheckAuthorization()) {
      // TODO: implement ensure logic
      const requiredPrivileges: string[] = [securityAuth.actions.cases.get(className, operation)];

      const checkPrivileges = securityAuth.checkPrivilegesDynamicallyWithRequest(this.request);
      const { hasAllRequested, username, privileges } = await checkPrivileges({
        kibana: requiredPrivileges,
      });

      if (!isAvailableClass) {
        // TODO: throw if any of the class are not available
        /**
         * Under most circumstances this would have been caught by `checkPrivileges` as
         * a user can't have Privileges to an unknown class, but super users
         * don't actually get "privilege checked" so the made up class *will* return
         * as Privileged.
         * This check will ensure we don't accidentally let these through
         */
        // TODO: audit log using `username`
        throw Boom.forbidden('User does not have permissions for this class');
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
        throw Boom.forbidden('Not authorized for this class');
      }
    } else if (!isAvailableClass) {
      // TODO: throw an error
      throw Boom.forbidden('Security is disabled but no class was found');
    }

    // else security is disabled so let the operation proceed
  }
}
