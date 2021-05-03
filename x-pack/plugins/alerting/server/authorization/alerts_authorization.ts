/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { map, mapValues, fromPairs, has, get } from 'lodash';
import { KibanaRequest } from 'src/core/server';
import { ALERTS_FEATURE_ID } from '../../common';
import { AlertTypeRegistry } from '../types';
import { SecurityPluginSetup } from '../../../security/server';
import { RegistryAlertType } from '../alert_type_registry';
import { PluginStartContract as FeaturesPluginStart } from '../../../features/server';
import { AlertsAuthorizationAuditLogger, ScopeType } from './audit_logger';
import { Space } from '../../../spaces/server';
import { asFiltersByRuleTypeAndConsumer } from './alerts_authorization_kuery';
import { KueryNode } from '../../../../../src/plugins/data/server';

export enum AlertingAuthorizationTypes {
  Rule = 'rule',
  Alert = 'alert',
}

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

export interface EnsureAuthorizedOpts {
  ruleTypeId: string;
  consumer: string;
  operation: ReadOperations | WriteOperations;
  authorizationType: AlertingAuthorizationTypes;
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
  privilegeName: string;
  exemptConsumerIds: string[];
  authorization?: SecurityPluginSetup['authz'];
}

export class AlertsAuthorization {
  private readonly alertTypeRegistry: AlertTypeRegistry;
  private readonly request: KibanaRequest;
  private readonly authorization?: SecurityPluginSetup['authz'];
  private readonly auditLogger: AlertsAuthorizationAuditLogger;
  private readonly featuresIds: Promise<Set<string>>;
  private readonly allPossibleConsumers: Promise<AuthorizedConsumers>;
  private readonly privilegeName: string;
  private readonly exemptConsumerIds: string[];

  constructor({
    alertTypeRegistry,
    request,
    authorization,
    features,
    auditLogger,
    getSpace,
    privilegeName,
    exemptConsumerIds,
  }: ConstructorOptions) {
    this.request = request;
    this.authorization = authorization;
    this.alertTypeRegistry = alertTypeRegistry;
    this.auditLogger = auditLogger;
    this.privilegeName = privilegeName;

    // List of consumer ids that are exempt from privilege check. This should be used sparingly.
    // An example of this is the Rules Management `consumer` as we don't want to have to
    // manually authorize each rule type in the management UI.
    this.exemptConsumerIds = exemptConsumerIds;

    this.featuresIds = getSpace(request)
      .then((maybeSpace) => new Set(maybeSpace?.disabledFeatures ?? []))
      .then(
        (disabledFeatures) =>
          new Set(
            features
              .getKibanaFeatures()
              .filter((feature) => {
                // ignore features which are disabled in the user's space
                return (
                  !disabledFeatures.has(feature.id) &&
                  // ignore features which don't grant privileges to the specified privilege
                  (get(feature, this.privilegeName, undefined)?.length ?? 0 > 0)
                );
              })
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
        ? asAuthorizedConsumers([...this.exemptConsumerIds, ...featuresIds], {
            read: true,
            all: true,
          })
        : {}
    );
  }

  private shouldCheckAuthorization(): boolean {
    return this.authorization?.mode?.useRbacForRequest(this.request) ?? false;
  }

  public async ensureAuthorized({
    ruleTypeId,
    consumer,
    operation,
    authorizationType,
  }: EnsureAuthorizedOpts) {
    const { authorization } = this;

    const isAvailableConsumer = has(await this.allPossibleConsumers, consumer);
    if (authorization && this.shouldCheckAuthorization()) {
      const ruleType = this.alertTypeRegistry.get(ruleTypeId);
      const requiredPrivilegesByScope = {
        consumer: authorization.actions.alerting.get(
          ruleTypeId,
          consumer,
          authorizationType,
          operation
        ),
        producer: authorization.actions.alerting.get(
          ruleTypeId,
          ruleType.producer,
          authorizationType,
          operation
        ),
      };

      // Skip authorizing consumer if it is in the list of exempt consumer ids
      const shouldAuthorizeConsumer = !this.exemptConsumerIds.includes(consumer);

      const checkPrivileges = authorization.checkPrivilegesDynamicallyWithRequest(this.request);
      const { hasAllRequested, username, privileges } = await checkPrivileges({
        kibana:
          shouldAuthorizeConsumer && consumer !== ruleType.producer
            ? [
                // check for access at consumer level
                requiredPrivilegesByScope.consumer,
                // check for access at producer level
                requiredPrivilegesByScope.producer,
              ]
            : [
                // skip consumer privilege checks for exempt consumer ids as all rule types can
                // be created for exempt consumers if user has producer level privileges
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
            ruleTypeId,
            ScopeType.Consumer,
            consumer,
            operation,
            authorizationType
          )
        );
      }

      if (hasAllRequested) {
        this.auditLogger.alertsAuthorizationSuccess(
          username,
          ruleTypeId,
          ScopeType.Consumer,
          consumer,
          operation,
          authorizationType
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
            : [ScopeType.Producer, ruleType.producer];

        throw Boom.forbidden(
          this.auditLogger.alertsAuthorizationFailure(
            username,
            ruleTypeId,
            unauthorizedScopeType,
            unauthorizedScope,
            operation,
            authorizationType
          )
        );
      }
    } else if (!isAvailableConsumer) {
      throw Boom.forbidden(
        this.auditLogger.alertsAuthorizationFailure(
          '',
          ruleTypeId,
          ScopeType.Consumer,
          consumer,
          operation,
          authorizationType
        )
      );
    }
  }

  public async getFindAuthorizationFilter(
    authorizationType: AlertingAuthorizationTypes
  ): Promise<{
    filter?: KueryNode;
    ensureRuleTypeIsAuthorized: (ruleTypeId: string, consumer: string) => void;
    logSuccessfulAuthorization: () => void;
  }> {
    if (this.authorization && this.shouldCheckAuthorization()) {
      const { username, authorizedRuleTypes } = await this.augmentRuleTypesWithAuthorization(
        this.alertTypeRegistry.list(),
        [ReadOperations.Find],
        authorizationType
      );

      if (!authorizedRuleTypes.size) {
        throw Boom.forbidden(
          this.auditLogger.alertsUnscopedAuthorizationFailure(username!, 'find')
        );
      }

      const authorizedRuleTypeIdsToConsumers = new Set<string>(
        [...authorizedRuleTypes].reduce<string[]>((ruleTypeIdConsumerPairs, ruleType) => {
          for (const consumer of Object.keys(ruleType.authorizedConsumers)) {
            ruleTypeIdConsumerPairs.push(`${ruleType.id}/${consumer}`);
          }
          return ruleTypeIdConsumerPairs;
        }, [])
      );

      const authorizedEntries: Map<string, Set<string>> = new Map();
      return {
        filter: asFiltersByRuleTypeAndConsumer(authorizedRuleTypes),
        ensureRuleTypeIsAuthorized: (ruleTypeId: string, consumer: string) => {
          if (!authorizedRuleTypeIdsToConsumers.has(`${ruleTypeId}/${consumer}`)) {
            throw Boom.forbidden(
              this.auditLogger.alertsAuthorizationFailure(
                username!,
                ruleTypeId,
                ScopeType.Consumer,
                consumer,
                'find',
                authorizationType
              )
            );
          } else {
            if (authorizedEntries.has(ruleTypeId)) {
              authorizedEntries.get(ruleTypeId)!.add(consumer);
            } else {
              authorizedEntries.set(ruleTypeId, new Set([consumer]));
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
              'find',
              authorizationType
            );
          }
        },
      };
    }
    return {
      ensureRuleTypeIsAuthorized: (ruleTypeId: string, consumer: string) => {},
      logSuccessfulAuthorization: () => {},
    };
  }

  public async filterByRuleTypeAuthorization(
    ruleTypes: Set<RegistryAlertType>,
    operations: Array<ReadOperations | WriteOperations>,
    authorizationType: AlertingAuthorizationTypes
  ): Promise<Set<RegistryAlertTypeWithAuth>> {
    const { authorizedRuleTypes } = await this.augmentRuleTypesWithAuthorization(
      ruleTypes,
      operations,
      authorizationType
    );
    return authorizedRuleTypes;
  }

  private async augmentRuleTypesWithAuthorization(
    ruleTypes: Set<RegistryAlertType>,
    operations: Array<ReadOperations | WriteOperations>,
    authorizationType: AlertingAuthorizationTypes
  ): Promise<{
    username?: string;
    hasAllRequested: boolean;
    authorizedRuleTypes: Set<RegistryAlertTypeWithAuth>;
  }> {
    const featuresIds = await this.featuresIds;
    if (this.authorization && this.shouldCheckAuthorization()) {
      const checkPrivileges = this.authorization.checkPrivilegesDynamicallyWithRequest(
        this.request
      );

      // add an empty `authorizedConsumers` array on each ruleType
      const ruleTypesWithAuthorization = this.augmentWithAuthorizedConsumers(ruleTypes, {});

      // map from privilege to ruleType which we can refer back to when analyzing the result
      // of checkPrivileges
      const privilegeToRuleType = new Map<
        string,
        [RegistryAlertTypeWithAuth, string, HasPrivileges, IsAuthorizedAtProducerLevel]
      >();
      // as we can't ask ES for the user's individual privileges we need to ask for each feature
      // and alertType in the system whether this user has this privilege
      for (const ruleType of ruleTypesWithAuthorization) {
        for (const feature of featuresIds) {
          for (const operation of operations) {
            privilegeToRuleType.set(
              // this function needs to be swappable
              this.authorization!.actions.alerting.get(
                ruleType.id,
                feature,
                authorizationType,
                operation
              ),
              [ruleType, feature, hasPrivilegeByOperation(operation), ruleType.producer === feature]
            );
          }
        }
      }

      const { username, hasAllRequested, privileges } = await checkPrivileges({
        kibana: [...privilegeToRuleType.keys()],
      });

      return {
        username,
        hasAllRequested,
        authorizedRuleTypes: hasAllRequested
          ? // has access to all features
            this.augmentWithAuthorizedConsumers(ruleTypes, await this.allPossibleConsumers)
          : // only has some of the required privileges
            privileges.kibana.reduce((authorizedRuleTypes, { authorized, privilege }) => {
              if (authorized && privilegeToRuleType.has(privilege)) {
                const [
                  ruleType,
                  feature,
                  hasPrivileges,
                  isAuthorizedAtProducerLevel,
                ] = privilegeToRuleType.get(privilege)!;
                ruleType.authorizedConsumers[feature] = mergeHasPrivileges(
                  hasPrivileges,
                  ruleType.authorizedConsumers[feature]
                );

                if (isAuthorizedAtProducerLevel && this.exemptConsumerIds.length > 0) {
                  // granting privileges under the producer automatically authorized exempt consumer IDs as well
                  this.exemptConsumerIds.forEach((exemptId: string) => {
                    ruleType.authorizedConsumers[exemptId] = mergeHasPrivileges(
                      hasPrivileges,
                      ruleType.authorizedConsumers[exemptId]
                    );
                  });
                }
                authorizedRuleTypes.add(ruleType);
              }
              return authorizedRuleTypes;
            }, new Set<RegistryAlertTypeWithAuth>()),
      };
    } else {
      return {
        hasAllRequested: true,
        authorizedRuleTypes: this.augmentWithAuthorizedConsumers(
          new Set([...ruleTypes].filter((ruleType) => featuresIds.has(ruleType.producer))),
          await this.allPossibleConsumers
        ),
      };
    }
  }

  private augmentWithAuthorizedConsumers(
    ruleTypes: Set<RegistryAlertType>,
    authorizedConsumers: AuthorizedConsumers
  ): Set<RegistryAlertTypeWithAuth> {
    return new Set(
      Array.from(ruleTypes).map((ruleType) => ({
        ...ruleType,
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
