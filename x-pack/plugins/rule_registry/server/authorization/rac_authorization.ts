/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'src/core/server';
import { SecurityPluginStart } from '../../../security/server';
import { PluginStartContract as FeaturesPluginStart } from '../../../features/server';
import { Space } from '../../../spaces/server';
import { KueryNode } from '../../../../../src/plugins/data/server';

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

type AuthorizedConsumers = Record<string, HasPrivileges>;
export interface RegistryAlertTypeWithAuth extends RegistryAlertType {
  authorizedConsumers: AuthorizedConsumers;
}

type IsAuthorizedAtProducerLevel = boolean;

export interface ConstructorOptions {
  request: KibanaRequest;
  owners: FeaturesPluginStart;
  getSpace: (request: KibanaRequest) => Promise<Space | undefined>;
  auditLogger: AlertsAuthorizationAuditLogger;
  authorization?: SecurityPluginStart['authz'];
}

export class RacAuthorization {
  private readonly request: KibanaRequest;
  private readonly authorization?: SecurityPluginStart['authz'];
  private readonly auditLogger: AlertsAuthorizationAuditLogger;
  private readonly owners: Set<string>;
  private readonly isAuthEnabled: boolean;

  constructor({ request, authorization, owners, auditLogger, getSpace }: ConstructorOptions) {
    this.request = request;
    this.authorization = authorization;
    this.auditLogger = auditLogger;
    this.owners = new Set<string>();

    try {
      const disabledFeatures = new Set((await getSpace(request))?.disabledFeatures ?? []);

      this.owners = new Set(
        owners
          .getKibanaFeatures()
          // get all the alert owners that aren't disabled
          .filter(({ id }) => !disabledFeatures.has(id))
          .flatMap((feature) => feature.rac ?? [])
      );
    } catch (error) {
      this.owners = new Set<string>();
    }
  }

  private shouldCheckAuthorization(): boolean {
    return this.authorization?.mode?.useRbacForRequest(this.request) ?? false;
  }

  public async ensureAuthorized(
    alertTypeId: string,
    consumer: string,
    operation: ReadOperations | WriteOperations
  ) {
    const { authorization } = this;

    // const isAvailableConsumer = has(await this.allPossibleConsumers, consumer);
    // if (authorization && this.shouldCheckAuthorization()) {
    //   const alertType = this.alertTypeRegistry.get(alertTypeId);
    //   const requiredPrivilegesByScope = {
    //     consumer: authorization.actions.alerting.get(alertTypeId, consumer, operation),
    //     producer: authorization.actions.alerting.get(alertTypeId, alertType.producer, operation),
    //   };

    //   // We special case the Alerts Management `consumer` as we don't want to have to
    //   // manually authorize each alert type in the management UI
    //   const shouldAuthorizeConsumer = consumer !== ALERTS_FEATURE_ID;

    //   const checkPrivileges = authorization.checkPrivilegesDynamicallyWithRequest(this.request);
    //   const { hasAllRequested, username, privileges } = await checkPrivileges({
    //     kibana: shouldAuthorizeConsumer
    //       ? [
    //           // check for access at consumer level
    //           requiredPrivilegesByScope.consumer,
    //           // check for access at producer level
    //           requiredPrivilegesByScope.producer,
    //         ]
    //       : [
    //           // skip consumer privilege checks under `alerts` as all alert types can
    //           // be created under `alerts` if you have producer level privileges
    //           requiredPrivilegesByScope.producer,
    //         ],
    //   });

    //   if (!isAvailableConsumer) {
    //     /**
    //      * Under most circumstances this would have been caught by `checkPrivileges` as
    //      * a user can't have Privileges to an unknown consumer, but super users
    //      * don't actually get "privilege checked" so the made up consumer *will* return
    //      * as Privileged.
    //      * This check will ensure we don't accidentally let these through
    //      */
    //     throw Boom.forbidden(
    //       this.auditLogger.alertsAuthorizationFailure(
    //         username,
    //         alertTypeId,
    //         ScopeType.Consumer,
    //         consumer,
    //         operation
    //       )
    //     );
    //   }

    //   if (hasAllRequested) {
    //     this.auditLogger.alertsAuthorizationSuccess(
    //       username,
    //       alertTypeId,
    //       ScopeType.Consumer,
    //       consumer,
    //       operation
    //     );
    //   } else {
    //     const authorizedPrivileges = map(
    //       privileges.kibana.filter((privilege) => privilege.authorized),
    //       'privilege'
    //     );
    //     const unauthorizedScopes = mapValues(
    //       requiredPrivilegesByScope,
    //       (privilege) => !authorizedPrivileges.includes(privilege)
    //     );

    //     const [unauthorizedScopeType, unauthorizedScope] =
    //       shouldAuthorizeConsumer && unauthorizedScopes.consumer
    //         ? [ScopeType.Consumer, consumer]
    //         : [ScopeType.Producer, alertType.producer];

    //     throw Boom.forbidden(
    //       this.auditLogger.alertsAuthorizationFailure(
    //         username,
    //         alertTypeId,
    //         unauthorizedScopeType,
    //         unauthorizedScope,
    //         operation
    //       )
    //     );
    //   }
    // } else if (!isAvailableConsumer) {
    //   throw Boom.forbidden(
    //     this.auditLogger.alertsAuthorizationFailure(
    //       '',
    //       alertTypeId,
    //       ScopeType.Consumer,
    //       consumer,
    //       operation
    //     )
    //   );
    // }
  }

  public getFindAuthorizationFilter(): {
    filter?: KueryNode;
    ensureAlertTypeIsAuthorized: (alertTypeId: string, consumer: string) => void;
    logSuccessfulAuthorization: () => void;
  } {
    if (this.authorization && this.shouldCheckAuthorization()) {
      // create set of all possible auth spaceId/owner pairs user has

      return {
        filter: ('' as unknown) as KueryNode, // auth filter here
        ensureAlertTypeIsAuthorized: () => {},
        logSuccessfulAuthorization: () => {},
      };
    }
  }
}
