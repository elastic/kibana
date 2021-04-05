/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import { has, map, mapValues } from 'lodash';

import { KibanaRequest } from 'src/core/server';
import { SecurityPluginStart } from '../../../security/server';
import { PluginStartContract as FeaturesPluginStart } from '../../../features/server';
import { Space } from '../../../spaces/server';
import { KueryNode } from '../../../../../src/plugins/data/server';
import { getOwnersFilter } from './utils';

export type GetSpaceFn = (request: KibanaRequest) => Promise<Space | undefined>;

export enum ReadOperations {
  Get = 'get',
  Find = 'find',
}

export enum WriteOperations {
  Create = 'create',
  Update = 'update',
}

interface HasPrivileges {
  read: boolean;
  all: boolean;
}
export interface ConstructorOptions {
  request: KibanaRequest;
  owners: FeaturesPluginStart;
  getSpace: (request: KibanaRequest) => Promise<Space | undefined>;
  // auditLogger: AlertsAuthorizationAuditLogger;
  authorization?: SecurityPluginStart['authz'];
}

export class RacAuthorization {
  private readonly request: KibanaRequest;
  private readonly authorization?: SecurityPluginStart['authz'];
  // private readonly auditLogger: AlertsAuthorizationAuditLogger;
  private readonly featureOwners: Set<string>;
  private readonly isAuthEnabled: boolean;

  private constructor({
    request,
    authorization,
    owners,
    isAuthEnabled,
  }: {
    request: KibanaRequest;
    authorization?: SecurityPluginStart['authz'];
    owners: Set<string>;
    isAuthEnabled: boolean;
  }) {
    this.request = request;
    this.authorization = authorization;
    this.featureOwners = owners;
    this.isAuthEnabled = isAuthEnabled;
  }

  static async create({
    request,
    authorization,
    getSpace,
    features,
    isAuthEnabled,
  }: {
    request: KibanaRequest;
    authorization?: SecurityPluginStart['authz'];
    getSpace: GetSpaceFn;
    features: FeaturesPluginStart;
    isAuthEnabled: boolean;
  }): Promise<RacAuthorization> {
    let owners: Set<string>;

    try {
      // Gather all disabled features from user Space
      // const disabledFeatures = new Set((await getSpace(request))?.disabledFeatures ?? []);

      // Filter through all user Kibana features to find corresponding enabled
      // Rac feature owners like 'security-solution' or 'observability'
      owners = await new Set(
        features
          .getKibanaFeatures()
          // get all the rac 'owners' that aren't disabled
          // .filter(({ id }) => !disabledFeatures.has(id))
          .flatMap((feature) => {
            return feature.rac ?? [];
          })
      );
      console.error('---------> BEFORE OWNERS', owners);
    } catch (error) {
      console.error('---------> THERE WAS AN ERROR', error);
      owners = new Set<string>();
    }
    console.error('---------> OWNERS', JSON.stringify(Array.from(owners)));
    return new RacAuthorization({ request, authorization, owners, isAuthEnabled });
  }

  private shouldCheckAuthorization(): boolean {
    return this.authorization?.mode?.useRbacForRequest(this.request) ?? false;
  }

  public async ensureAuthorized(owner: string, operation: ReadOperations | WriteOperations) {
    const { authorization } = this;
    const isAvailableConsumer = has(await this.featureOwners, owner);
    if (authorization && this.shouldCheckAuthorization()) {
      const requiredPrivilegesByScope = {
        owner: authorization.actions.rac.get('default', owner, operation),
      };
      // We special case the Alerts Management `consumer` as we don't want to have to
      // manually authorize each alert type in the management UI
      const checkPrivileges = authorization.checkPrivilegesDynamicallyWithRequest(this.request);
      const { hasAllRequested, username, privileges } = await checkPrivileges({
        kibana: [
          // check for access at owner level
          requiredPrivilegesByScope.owner,
        ],
      });
      if (!isAvailableConsumer) {
        // TODO: implement this and send to audit logger later
        /**
         * Under most circumstances this would have been caught by `checkPrivileges` as
         * a user can't have Privileges to an unknown consumer, but super users
         * don't actually get "privilege checked" so the made up consumer *will* return
         * as Privileged.
         * This check will ensure we don't accidentally let these through
         */
        // throw Boom.forbidden(
        //   this.auditLogger.alertsAuthorizationFailure(
        //     username,
        //     alertTypeId,
        //     ScopeType.Consumer,
        //     consumer,
        //     operation
        //   )
        // );
        console.error('UNKNOWN CONSUMER');
        throw Error('UNKNOWN CONSUMER');
      }
      if (hasAllRequested) {
        // TODO: implement when we add audit logger
        // this.auditLogger.alertsAuthorizationSuccess(
        //   username,
        //   alertTypeId,
        //   ScopeType.Consumer,
        //   consumer,
        //   operation
        // );
        console.error('GREAT SUCCESS');
      } else {
        console.error('DOES NOT HAVE ALL REQUESTED');
        // throw Boom.forbidden(
        //   this.auditLogger.alertsAuthorizationFailure(
        //     username,
        //     alertTypeId,
        //     unauthorizedScopeType,
        //     unauthorizedScope,
        //     operation
        //   )
        // );
        throw Error('DOES NOT HAVE ALL REQUESTED');
      }
    } else if (!isAvailableConsumer) {
      // throw Boom.forbidden(
      //   this.auditLogger.alertsAuthorizationFailure(
      //     '',
      //     alertTypeId,
      //     ScopeType.Consumer,
      //     consumer,
      //     operation
      //   )
      // );
      console.error('UNAVAILABLE OWNER');
      throw Error('UNAVAILABLE OWNER');
    }
  }

  public async getFindAuthorizationFilter(): Promise<{
    filter?: KueryNode;
    ensureAlertTypeIsAuthorized: (alertTypeId: string, consumer: string) => void;
    logSuccessfulAuthorization: () => void;
  }> {
    // if (this.authorization && this.shouldCheckAuthorization()) {
    //   const { authorizedOwners } = await this.getAuthorizedOwners([ReadOperations.Find]);
    //   if (!authorizedOwners.length) {
    //     // TODO: Better error message, log error
    //     throw Boom.forbidden('Not authorized for this owner');
    //   }
    //   return {
    //     filter: getOwnersFilter(savedObjectType, authorizedOwners),
    //     ensureAlertTypeIsAuthorized: (owner: string) => {
    //       if (!authorizedOwners.includes(owner)) {
    //         // TODO: log error
    //         throw Boom.forbidden('Not authorized for this owner');
    //       }
    //     },
    //   };
    // }
    return {
      ensureAlertTypeIsAuthorized: (alertTypeId: string, consumer: string) => {},
      logSuccessfulAuthorization: () => {},
    };
  }

  // private async getAuthorizedOwners(
  //   operations: Array<ReadOperations | WriteOperations>
  // ): Promise<{
  //   username?: string;
  //   hasAllRequested: boolean;
  //   authorizedOwners: string[];
  // }> {
  //   const { securityAuth, featureCaseOwners } = this;
  //   if (securityAuth && this.shouldCheckAuthorization()) {
  //     const checkPrivileges = securityAuth.checkPrivilegesDynamicallyWithRequest(this.request);
  //     const requiredPrivileges = new Map<string, [string]>();

  //     for (const owner of featureCaseOwners) {
  //       for (const operation of operations) {
  //         requiredPrivileges.set(securityAuth.actions.cases.get(owner, operation), [owner]);
  //       }
  //     }

  //     const { hasAllRequested, username, privileges } = await checkPrivileges({
  //       kibana: [...requiredPrivileges.keys()],
  //     });

  //     return {
  //       hasAllRequested,
  //       username,
  //       authorizedOwners: hasAllRequested
  //         ? Array.from(featureCaseOwners)
  //         : privileges.kibana.reduce<string[]>((authorizedOwners, { authorized, privilege }) => {
  //             if (authorized && requiredPrivileges.has(privilege)) {
  //               const [owner] = requiredPrivileges.get(privilege)!;
  //               authorizedOwners.push(owner);
  //             }

  //             return authorizedOwners;
  //           }, []),
  //     };
  //   } else {
  //     return {
  //       hasAllRequested: true,
  //       authorizedOwners: Array.from(featureCaseOwners),
  //     };
  //   }
  // }
}
