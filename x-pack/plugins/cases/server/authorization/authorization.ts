/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'kibana/server';
import { Space } from '../../../spaces/server';
import { SecurityPluginStart } from '../../../security/server';
import { PluginStartContract as FeaturesPluginStart } from '../../../features/server';

// TODO: probably should move these to the types.ts file
// TODO: Larry would prefer if we have an operation per entity route so I think we need to create a bunch like
//  getCase, getComment, getSubCase etc for each, need to think of a clever way of creating them for all the routes easily?
export enum ReadOperations {
  Get = 'get',
  Find = 'find',
}

export enum WriteOperations {
  Create = 'create',
  Delete = 'delete',
  Update = 'update',
}

type GetSpaceFn = (request: KibanaRequest) => Promise<Space | undefined>;

/**
 * This class handles ensuring that the user making a request has the correct permissions
 * for the API request.
 */
export class Authorization {
  private readonly request: KibanaRequest;
  private readonly securityAuth: SecurityPluginStart['authz'] | undefined;
  private readonly featureCaseClasses: Set<string>;
  // TODO: create this
  // private readonly auditLogger: AuthorizationAuditLogger;

  private constructor({
    request,
    securityAuth,
    caseClasses,
  }: {
    request: KibanaRequest;
    securityAuth?: SecurityPluginStart['authz'];
    caseClasses: Set<string>;
  }) {
    this.request = request;
    this.securityAuth = securityAuth;
    this.featureCaseClasses = caseClasses;
  }

  /**
   * Creates an Authorization object.
   */
  static async create({
    request,
    securityAuth,
    getSpace,
    features,
  }: {
    request: KibanaRequest;
    securityAuth?: SecurityPluginStart['authz'];
    getSpace: GetSpaceFn;
    features: FeaturesPluginStart;
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

    return new Authorization({ request, securityAuth, caseClasses });
  }

  private shouldCheckAuthorization(): boolean {
    return this.securityAuth?.mode?.useRbacForRequest(this.request) ?? false;
  }

  public async ensureAuthorized(classes: string[], operation: ReadOperations | WriteOperations) {
    const { securityAuth } = this;
    const areAllClassAvailable = classes.every((className) =>
      this.featureCaseClasses.has(className)
    );
    // TODO: throw if the request is not authorized
    if (securityAuth && this.shouldCheckAuthorization()) {
      // TODO: implement ensure logic
      const requiredPrivileges: string[] = classes.map((className) =>
        securityAuth.actions.cases.get(className, operation)
      );

      const checkPrivileges = securityAuth.checkPrivilegesDynamicallyWithRequest(this.request);
      const { hasAllRequested, username, privileges } = checkPrivileges({
        kibana: requiredPrivileges,
      });

      if (!areAllClassAvailable) {
        // TODO: throw if any of the class are not available
        /**
         * Under most circumstances this would have been caught by `checkPrivileges` as
         * a user can't have Privileges to an unknown class, but super users
         * don't actually get "privilege checked" so the made up class *will* return
         * as Privileged.
         * This check will ensure we don't accidentally let these through
         */
      }
    }
  }
}
