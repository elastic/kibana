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
    // TODO: throw if the request is not authorized
    if (this.shouldCheckAuthorization()) {
      // TODO: implement ensure logic
    }
  }
}
