/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { pluck, mapValues, remove, omit, isUndefined, zipObject } from 'lodash';
import { KibanaRequest } from 'src/core/server';
import { RecursiveReadonly } from '@kbn/utility-types';
import { ALERTS_FEATURE_ID } from '../../common';
import { AlertTypeRegistry } from '../types';
import { SecurityPluginSetup } from '../../../security/server';
import { RegistryAlertType } from '../alert_type_registry';
import { FeatureKibanaPrivileges, SubFeaturePrivilegeConfig } from '../../../features/common';
import { PluginStartContract as FeaturesPluginStart } from '../../../features/server';
import { AlertsAuthorizationAuditLogger, ScopeType } from './audit_logger';

export enum ReadOperations {
  Get = 'get',
  GetAlertState = 'getAlertState',
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
  auditLogger: AlertsAuthorizationAuditLogger;
  authorization?: SecurityPluginSetup['authz'];
}

export class AlertsAuthorization {
  private readonly alertTypeRegistry: AlertTypeRegistry;
  private readonly features: FeaturesPluginStart;
  private readonly request: KibanaRequest;
  private readonly authorization?: SecurityPluginSetup['authz'];
  private readonly auditLogger: AlertsAuthorizationAuditLogger;

  constructor({
    alertTypeRegistry,
    request,
    authorization,
    features,
    auditLogger,
  }: ConstructorOptions) {
    this.request = request;
    this.authorization = authorization;
    this.features = features;
    this.alertTypeRegistry = alertTypeRegistry;
    this.auditLogger = auditLogger;
  }

  public async ensureAuthorized(
    alertTypeId: string,
    consumer: string,
    operation: ReadOperations | WriteOperations
  ) {
    const { authorization } = this;
    if (authorization) {
      const alertType = this.alertTypeRegistry.get(alertTypeId);

      // We special case the Alerts Management `consumer` as we don't want to have to
      // manually authorize each alert type in the management UI
      const shouldAuthorizeConsumer = consumer !== ALERTS_FEATURE_ID;
      // We special case the Alerts Management `prodcuer` as all users are authorized
      // to use built-in alert types by definition
      const shouldAuthorizeProducer =
        alertType.producer !== ALERTS_FEATURE_ID && alertType.producer !== consumer;

      if (shouldAuthorizeConsumer || shouldAuthorizeProducer) {
        const requiredPrivilegesByScope = omit(
          {
            consumer: shouldAuthorizeConsumer
              ? authorization.actions.alerting.get(alertTypeId, consumer, operation)
              : undefined,
            producer: shouldAuthorizeProducer
              ? authorization.actions.alerting.get(alertTypeId, alertType.producer, operation)
              : undefined,
          },
          isUndefined
        );

        const checkPrivileges = authorization.checkPrivilegesDynamicallyWithRequest(this.request);
        const { hasAllRequested, username, privileges } = await checkPrivileges(
          Object.values(requiredPrivilegesByScope)
        );

        if (hasAllRequested) {
          this.auditLogger.alertsAuthorizationSuccess(
            username,
            alertTypeId,
            ScopeType.Consumer,
            consumer,
            operation
          );
        } else {
          const authorizedPrivileges = pluck(
            privileges.filter((privilege) => privilege.authorized),
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
      }
    }
  }

  public async getFindAuthorizationFilter(): Promise<{
    filter?: string;
    ensureAlertTypeIsAuthorized: (alertTypeId: string, consumer: string) => void;
  }> {
    if (this.authorization) {
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

      return {
        filter: `(${this.asFiltersByAlertTypeAndConsumer(authorizedAlertTypes).join(' or ')})`,
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
            this.auditLogger.alertsAuthorizationSuccess(
              username!,
              alertTypeId,
              ScopeType.Consumer,
              consumer,
              'find'
            );
          }
        },
      };
    }
    return {
      ensureAlertTypeIsAuthorized: (alertTypeId: string, consumer: string) => {},
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
    const featuresIds = this.features
      .getFeatures()
      // ignore features which don't grant privileges to alerting
      .filter(({ privileges, subFeatures }) => {
        return (
          hasAnyAlertingPrivileges(privileges?.all) ||
          hasAnyAlertingPrivileges(privileges?.read) ||
          subFeatures.some((subFeature) =>
            subFeature.privilegeGroups.some((privilegeGroup) =>
              privilegeGroup.privileges.some((subPrivileges) =>
                hasAnyAlertingPrivileges(subPrivileges)
              )
            )
          )
        );
      })
      .map((feature) => feature.id);

    const allPossibleConsumers: AuthorizedConsumers = asAuthorizedConsumers(
      [ALERTS_FEATURE_ID, ...featuresIds],
      { read: true, all: true }
    );

    if (!this.authorization) {
      return {
        hasAllRequested: true,
        authorizedAlertTypes: this.augmentWithAuthorizedConsumers(alertTypes, allPossibleConsumers),
      };
    } else {
      const checkPrivileges = this.authorization.checkPrivilegesDynamicallyWithRequest(
        this.request
      );

      // add an empty `authorizedConsumers` array on each alertType
      const alertTypesWithAutherization = this.augmentWithAuthorizedConsumers(alertTypes, {});
      const preAuthorizedAlertTypes = new Set<RegistryAlertTypeWithAuth>();

      // map from privilege to alertType which we can refer back to when analyzing the result
      // of checkPrivileges
      const privilegeToAlertType = new Map<
        string,
        [RegistryAlertTypeWithAuth, string, HasPrivileges, IsAuthorizedAtProducerLevel]
      >();
      // as we can't ask ES for the user's individual privileges we need to ask for each feature
      // and alertType in the system whether this user has this privilege
      for (const alertType of alertTypesWithAutherization) {
        if (alertType.producer === ALERTS_FEATURE_ID) {
          alertType.authorizedConsumers[ALERTS_FEATURE_ID] = { read: true, all: true };
          preAuthorizedAlertTypes.add(alertType);
        }

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

      const { username, hasAllRequested, privileges } = await checkPrivileges([
        ...privilegeToAlertType.keys(),
      ]);

      return {
        username,
        hasAllRequested,
        authorizedAlertTypes: hasAllRequested
          ? // has access to all features
            this.augmentWithAuthorizedConsumers(alertTypes, allPossibleConsumers)
          : // only has some of the required privileges
            privileges.reduce((authorizedAlertTypes, { authorized, privilege }) => {
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
            }, preAuthorizedAlertTypes),
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

  private asFiltersByAlertTypeAndConsumer(alertTypes: Set<RegistryAlertTypeWithAuth>): string[] {
    return Array.from(alertTypes).reduce<string[]>((filters, { id, authorizedConsumers }) => {
      ensureFieldIsSafeForQuery('alertTypeId', id);
      filters.push(
        `(alert.attributes.alertTypeId:${id} and alert.attributes.consumer:(${Object.keys(
          authorizedConsumers
        )
          .map((consumer) => {
            ensureFieldIsSafeForQuery('alertTypeId', id);
            return consumer;
          })
          .join(' or ')}))`
      );
      return filters;
    }, []);
  }
}

export function ensureFieldIsSafeForQuery(field: string, value: string): boolean {
  const invalid = value.match(/([>=<\*:()]+|\s+)/g);
  if (invalid) {
    const whitespace = remove(invalid, (chars) => chars.trim().length === 0);
    const errors = [];
    if (whitespace.length) {
      errors.push(`whitespace`);
    }
    if (invalid.length) {
      errors.push(`invalid character${invalid.length > 1 ? `s` : ``}: ${invalid?.join(`, `)}`);
    }
    throw new Error(`expected ${field} not to include ${errors.join(' and ')}`);
  }
  return true;
}

function hasAnyAlertingPrivileges(
  privileges?:
    | RecursiveReadonly<FeatureKibanaPrivileges>
    | RecursiveReadonly<SubFeaturePrivilegeConfig>
): boolean {
  return (
    ((privileges?.alerting?.all?.length ?? 0) || (privileges?.alerting?.read?.length ?? 0)) > 0
  );
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
  return zipObject(consumers.map((feature) => [feature, hasPrivileges]));
}
