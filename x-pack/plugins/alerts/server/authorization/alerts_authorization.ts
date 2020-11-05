/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { map, mapValues, fromPairs, has } from 'lodash';
import { KibanaRequest } from 'src/core/server';
import { ALERTS_FEATURE_ID } from '../../common';
import { AlertTypeRegistry, RawAlert } from '../types';
import { SecurityPluginSetup } from '../../../security/server';
import { RegistryAlertType } from '../alert_type_registry';
import { PluginStartContract as FeaturesPluginStart } from '../../../features/server';
import { AlertsAuthorizationAuditLogger, ScopeType } from './audit_logger';
import { Space } from '../../../spaces/server';
import { LEGACY_LAST_MODIFIED_VERSION } from '../saved_objects/migrations';
import { asFiltersByAlertTypeAndConsumer } from './alerts_authorization_kuery';
import { KueryNode } from '../../../../../src/plugins/data/server';

export enum ReadOperations {
  Get = 'get',
  GetAlertState = 'getAlertState',
  GetAlertInstanceSummary = 'getAlertInstanceSummary',
  Find = 'find',
}

export enum WriteOperations {
  Create = 'create',
  Delete = 'delete',
  Update = 'update',
  UpdateApiKey = 'updateApiKey',
  Enable = 'enable',
  Disable = 'disable',
  MuteAll = 'muteAll',
  UnmuteAll = 'unmuteAll',
  MuteInstance = 'muteInstance',
  UnmuteInstance = 'unmuteInstance',
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
  alertTypeRegistry: AlertTypeRegistry;
  request: KibanaRequest;
  features: FeaturesPluginStart;
  getSpace: (request: KibanaRequest) => Promise<Space | undefined>;
  auditLogger: AlertsAuthorizationAuditLogger;
  authorization?: SecurityPluginSetup['authz'];
}

export class AlertsAuthorization {
  private readonly alertTypeRegistry: AlertTypeRegistry;
  private readonly request: KibanaRequest;
  private readonly authorization?: SecurityPluginSetup['authz'];
  private readonly auditLogger: AlertsAuthorizationAuditLogger;
  private readonly featuresIds: Promise<Set<string>>;
  private readonly allPossibleConsumers: Promise<AuthorizedConsumers>;

  constructor({
    alertTypeRegistry,
    request,
    authorization,
    features,
    auditLogger,
    getSpace,
  }: ConstructorOptions) {
    this.request = request;
    this.authorization = authorization;
    this.alertTypeRegistry = alertTypeRegistry;
    this.auditLogger = auditLogger;

    this.featuresIds = getSpace(request)
      .then((maybeSpace) => new Set(maybeSpace?.disabledFeatures ?? []))
      .then(
        (disabledFeatures) =>
          new Set(
            features
              .getKibanaFeatures()
              .filter(
                ({ id, alerting }) =>
                  // ignore features which are disabled in the user's space
                  !disabledFeatures.has(id) &&
                  // ignore features which don't grant privileges to alerting
                  (alerting?.length ?? 0 > 0)
              )
              .map((feature) => feature.id)
          )
      )
      .catch(() => {
        // failing to fetch the space means the user is likely not privileged in the
        // active space at all, which means that their list of features should be empty
        return new Set();
      });

    this.allPossibleConsumers = this.featuresIds.then((featuresIds) =>
      featuresIds.size
        ? asAuthorizedConsumers([ALERTS_FEATURE_ID, ...featuresIds], {
            read: true,
            all: true,
          })
        : {}
    );
  }

  public shouldUseLegacyAuthorization(alert: RawAlert): boolean {
    return alert.meta?.versionApiKeyLastmodified === LEGACY_LAST_MODIFIED_VERSION;
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

    const isAvailableConsumer = has(await this.allPossibleConsumers, consumer);
    if (authorization && this.shouldCheckAuthorization()) {
      const alertType = this.alertTypeRegistry.get(alertTypeId);
      const requiredPrivilegesByScope = {
        consumer: authorization.actions.alerting.get(alertTypeId, consumer, operation),
        producer: authorization.actions.alerting.get(alertTypeId, alertType.producer, operation),
      };

      // We special case the Alerts Management `consumer` as we don't want to have to
      // manually authorize each alert type in the management UI
      const shouldAuthorizeConsumer = consumer !== ALERTS_FEATURE_ID;

      const checkPrivileges = authorization.checkPrivilegesDynamicallyWithRequest(this.request);
      const { hasAllRequested, username, privileges } = await checkPrivileges({
        kibana:
          shouldAuthorizeConsumer && consumer !== alertType.producer
            ? [
                // check for access at consumer level
                requiredPrivilegesByScope.consumer,
                // check for access at producer level
                requiredPrivilegesByScope.producer,
              ]
            : [
                // skip consumer privilege checks under `alerts` as all alert types can
                // be created under `alerts` if you have producer level privileges
                requiredPrivilegesByScope.producer,
              ],
      });

      if (!isAvailableConsumer) {
        /**
         * Under most circumstances this would have been caught by `checkPrivileges` as
         * a user can't have Privileges to an unknown consumer, but super users
         * don't actually get "privilege checked" so the made up consumer *will* return
         * as Privileged.
         * This check will ensure we don't accidentally let these through
         */
        throw Boom.forbidden(
          this.auditLogger.alertsAuthorizationFailure(
            username,
            alertTypeId,
            ScopeType.Consumer,
            consumer,
            operation
          )
        );
      }

      if (hasAllRequested) {
        this.auditLogger.alertsAuthorizationSuccess(
          username,
          alertTypeId,
          ScopeType.Consumer,
          consumer,
          operation
        );
      } else {
        const authorizedPrivileges = map(
          privileges.kibana.filter((privilege) => privilege.authorized),
          'privilege'
        );
        const unauthorizedScopes = mapValues(
          requiredPrivilegesByScope,
          (privilege) => !authorizedPrivileges.includes(privilege)
        );

        const [unauthorizedScopeType, unauthorizedScope] =
          shouldAuthorizeConsumer && unauthorizedScopes.consumer
            ? [ScopeType.Consumer, consumer]
            : [ScopeType.Producer, alertType.producer];

        throw Boom.forbidden(
          this.auditLogger.alertsAuthorizationFailure(
            username,
            alertTypeId,
            unauthorizedScopeType,
            unauthorizedScope,
            operation
          )
        );
      }
    } else if (!isAvailableConsumer) {
      throw Boom.forbidden(
        this.auditLogger.alertsAuthorizationFailure(
          '',
          alertTypeId,
          ScopeType.Consumer,
          consumer,
          operation
        )
      );
    }
  }

  public async getFindAuthorizationFilter(): Promise<{
    filter?: KueryNode;
    ensureAlertTypeIsAuthorized: (alertTypeId: string, consumer: string) => void;
    logSuccessfulAuthorization: () => void;
  }> {
    if (this.authorization && this.shouldCheckAuthorization()) {
      const {
        username,
        authorizedAlertTypes,
      } = await this.augmentAlertTypesWithAuthorization(this.alertTypeRegistry.list(), [
        ReadOperations.Find,
      ]);

      if (!authorizedAlertTypes.size) {
        throw Boom.forbidden(
          this.auditLogger.alertsUnscopedAuthorizationFailure(username!, 'find')
        );
      }

      const authorizedAlertTypeIdsToConsumers = new Set<string>(
        [...authorizedAlertTypes].reduce<string[]>((alertTypeIdConsumerPairs, alertType) => {
          for (const consumer of Object.keys(alertType.authorizedConsumers)) {
            alertTypeIdConsumerPairs.push(`${alertType.id}/${consumer}`);
          }
          return alertTypeIdConsumerPairs;
        }, [])
      );

      const authorizedEntries: Map<string, Set<string>> = new Map();
      return {
        filter: asFiltersByAlertTypeAndConsumer(authorizedAlertTypes),
        ensureAlertTypeIsAuthorized: (alertTypeId: string, consumer: string) => {
          if (!authorizedAlertTypeIdsToConsumers.has(`${alertTypeId}/${consumer}`)) {
            throw Boom.forbidden(
              this.auditLogger.alertsAuthorizationFailure(
                username!,
                alertTypeId,
                ScopeType.Consumer,
                consumer,
                'find'
              )
            );
          } else {
            if (authorizedEntries.has(alertTypeId)) {
              authorizedEntries.get(alertTypeId)!.add(consumer);
            } else {
              authorizedEntries.set(alertTypeId, new Set([consumer]));
            }
          }
        },
        logSuccessfulAuthorization: () => {
          if (authorizedEntries.size) {
            this.auditLogger.alertsBulkAuthorizationSuccess(
              username!,
              [...authorizedEntries.entries()].reduce<Array<[string, string]>>(
                (authorizedPairs, [alertTypeId, consumers]) => {
                  for (const consumer of consumers) {
                    authorizedPairs.push([alertTypeId, consumer]);
                  }
                  return authorizedPairs;
                },
                []
              ),
              ScopeType.Consumer,
              'find'
            );
          }
        },
      };
    }
    return {
      ensureAlertTypeIsAuthorized: (alertTypeId: string, consumer: string) => {},
      logSuccessfulAuthorization: () => {},
    };
  }

  public async filterByAlertTypeAuthorization(
    alertTypes: Set<RegistryAlertType>,
    operations: Array<ReadOperations | WriteOperations>
  ): Promise<Set<RegistryAlertTypeWithAuth>> {
    const { authorizedAlertTypes } = await this.augmentAlertTypesWithAuthorization(
      alertTypes,
      operations
    );
    return authorizedAlertTypes;
  }

  private async augmentAlertTypesWithAuthorization(
    alertTypes: Set<RegistryAlertType>,
    operations: Array<ReadOperations | WriteOperations>
  ): Promise<{
    username?: string;
    hasAllRequested: boolean;
    authorizedAlertTypes: Set<RegistryAlertTypeWithAuth>;
  }> {
    const featuresIds = await this.featuresIds;
    if (this.authorization && this.shouldCheckAuthorization()) {
      const checkPrivileges = this.authorization.checkPrivilegesDynamicallyWithRequest(
        this.request
      );

      // add an empty `authorizedConsumers` array on each alertType
      const alertTypesWithAuthorization = this.augmentWithAuthorizedConsumers(alertTypes, {});

      // map from privilege to alertType which we can refer back to when analyzing the result
      // of checkPrivileges
      const privilegeToAlertType = new Map<
        string,
        [RegistryAlertTypeWithAuth, string, HasPrivileges, IsAuthorizedAtProducerLevel]
      >();
      // as we can't ask ES for the user's individual privileges we need to ask for each feature
      // and alertType in the system whether this user has this privilege
      for (const alertType of alertTypesWithAuthorization) {
        for (const feature of featuresIds) {
          for (const operation of operations) {
            privilegeToAlertType.set(
              this.authorization!.actions.alerting.get(alertType.id, feature, operation),
              [
                alertType,
                feature,
                hasPrivilegeByOperation(operation),
                alertType.producer === feature,
              ]
            );
          }
        }
      }

      const { username, hasAllRequested, privileges } = await checkPrivileges({
        kibana: [...privilegeToAlertType.keys()],
      });

      return {
        username,
        hasAllRequested,
        authorizedAlertTypes: hasAllRequested
          ? // has access to all features
            this.augmentWithAuthorizedConsumers(alertTypes, await this.allPossibleConsumers)
          : // only has some of the required privileges
            privileges.kibana.reduce((authorizedAlertTypes, { authorized, privilege }) => {
              if (authorized && privilegeToAlertType.has(privilege)) {
                const [
                  alertType,
                  feature,
                  hasPrivileges,
                  isAuthorizedAtProducerLevel,
                ] = privilegeToAlertType.get(privilege)!;
                alertType.authorizedConsumers[feature] = mergeHasPrivileges(
                  hasPrivileges,
                  alertType.authorizedConsumers[feature]
                );

                if (isAuthorizedAtProducerLevel) {
                  // granting privileges under the producer automatically authorized the Alerts Management UI as well
                  alertType.authorizedConsumers[ALERTS_FEATURE_ID] = mergeHasPrivileges(
                    hasPrivileges,
                    alertType.authorizedConsumers[ALERTS_FEATURE_ID]
                  );
                }
                authorizedAlertTypes.add(alertType);
              }
              return authorizedAlertTypes;
            }, new Set<RegistryAlertTypeWithAuth>()),
      };
    } else {
      return {
        hasAllRequested: true,
        authorizedAlertTypes: this.augmentWithAuthorizedConsumers(
          new Set([...alertTypes].filter((alertType) => featuresIds.has(alertType.producer))),
          await this.allPossibleConsumers
        ),
      };
    }
  }

  private augmentWithAuthorizedConsumers(
    alertTypes: Set<RegistryAlertType>,
    authorizedConsumers: AuthorizedConsumers
  ): Set<RegistryAlertTypeWithAuth> {
    return new Set(
      Array.from(alertTypes).map((alertType) => ({
        ...alertType,
        authorizedConsumers: { ...authorizedConsumers },
      }))
    );
  }
}

function mergeHasPrivileges(left: HasPrivileges, right?: HasPrivileges): HasPrivileges {
  return {
    read: (left.read || right?.read) ?? false,
    all: (left.all || right?.all) ?? false,
  };
}

function hasPrivilegeByOperation(operation: ReadOperations | WriteOperations): HasPrivileges {
  const read = Object.values(ReadOperations).includes((operation as unknown) as ReadOperations);
  const all = Object.values(WriteOperations).includes((operation as unknown) as WriteOperations);
  return {
    read: read || all,
    all,
  };
}

function asAuthorizedConsumers(
  consumers: string[],
  hasPrivileges: HasPrivileges
): AuthorizedConsumers {
  return fromPairs(consumers.map((feature) => [feature, hasPrivileges]));
}
