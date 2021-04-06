/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';

import { KibanaRequest } from 'src/core/server';
import { EventType, SecurityPluginStart } from '../../../security/server';
import { PluginStartContract as FeaturesPluginStart } from '../../../features/server';
import { Space } from '../../../spaces/server';
import { KueryNode } from '../../../../../src/plugins/data/server';
import { RacAuthorizationAuditLogger } from './audit_logger';
import { getEnabledKibanaSpaceFeatures } from './utils';

export type GetSpaceFn = (request: KibanaRequest) => Promise<Space | undefined>;

export enum ReadOperations {
  Get = 'get',
  Find = 'find',
}

export enum WriteOperations {
  Update = 'update',
}

interface HasPrivileges {
  read: boolean;
  all: boolean;
}
export interface ConstructorOptions {
  request: KibanaRequest;
  authorization?: SecurityPluginStart['authz'];
  owners: Set<string>;
  isAuthEnabled: boolean;
  auditLogger: RacAuthorizationAuditLogger;
}

export interface CreateOptions {
  request: KibanaRequest;
  authorization?: SecurityPluginStart['authz'];
  isAuthEnabled: boolean;
  auditLogger: RacAuthorizationAuditLogger;
  getSpace: GetSpaceFn;
  features: FeaturesPluginStart;
}

export class RacAuthorization {
  private readonly request: KibanaRequest;
  private readonly authorization?: SecurityPluginStart['authz'];
  private readonly auditLogger: RacAuthorizationAuditLogger;
  private readonly featureOwners: Set<string>;
  private readonly isAuthEnabled: boolean;

  constructor({ request, authorization, owners, isAuthEnabled, auditLogger }: ConstructorOptions) {
    this.request = request;
    this.authorization = authorization;
    this.featureOwners = owners;
    this.isAuthEnabled = isAuthEnabled;
    this.auditLogger = auditLogger;
  }

  static async create({
    request,
    authorization,
    getSpace,
    features,
    isAuthEnabled,
    auditLogger,
  }: CreateOptions): Promise<RacAuthorization> {
    const owners = await getEnabledKibanaSpaceFeatures({
      getSpace,
      request,
      features,
    });

    return new RacAuthorization({ request, authorization, owners, isAuthEnabled, auditLogger });
  }

  /**
   * Determines whether the security license is disabled
   */
  private shouldCheckAuthorization(): boolean {
    return this.authorization?.mode?.useRbacForRequest(this.request) ?? false;
  }

  public async ensureAuthorized(owner: string, operation: ReadOperations | WriteOperations) {
    const { authorization } = this;

    // Does the owner the client sent up match with the KibanaFeatures structure
    const isAvailableOwner = this.featureOwners.has(owner);

    if (authorization != null && this.shouldCheckAuthorization()) {
      const requiredPrivileges = [authorization.actions.rac.get(owner, operation)];
      const checkPrivileges = authorization.checkPrivilegesDynamicallyWithRequest(this.request);
      const { hasAllRequested, username, privileges } = await checkPrivileges({
        kibana: requiredPrivileges,
      });
      if (!isAvailableOwner) {
        /**
         * Under most circumstances this would have been caught by `checkPrivileges` as
         * a user can't have Privileges to an unknown consumer, but super users
         * don't actually get "privilege checked" so the made up consumer *will* return
         * as Privileged.
         * This check will ensure we don't accidentally let these through
         */
        throw Boom.forbidden(
          this.auditLogger.racAuthorizationFailure({
            owner,
            username,
            operation,
            type: EventType.ACCESS,
          })
        );
      }
      if (hasAllRequested) {
        this.auditLogger.racAuthorizationSuccess({
          owner,
          username,
          operation,
          type: EventType.ACCESS,
        });
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

        throw Boom.forbidden(
          this.auditLogger.racAuthorizationFailure({
            owner: unauthorizedPrivilages.join(','),
            username,
            operation,
            type: EventType.ACCESS,
          })
        );
      }
    } else if (!isAvailableOwner) {
      throw Boom.forbidden(
        this.auditLogger.racAuthorizationFailure({
          owner,
          username: '',
          operation,
          type: EventType.ACCESS,
        })
      );
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
