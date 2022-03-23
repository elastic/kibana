/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { map, mapValues, fromPairs, has } from 'lodash';
import { KibanaRequest } from 'src/core/server';
import { JsonObject } from '@kbn/utility-types';
import { KueryNode } from '@kbn/es-query';
import { ALERTS_FEATURE_ID, RuleTypeRegistry } from '../types';
import { SecurityPluginSetup } from '../../../security/server';
import { RegistryRuleType } from '../rule_type_registry';
import { PluginStartContract as FeaturesPluginStart } from '../../../features/server';
import { Space } from '../../../spaces/server';
import {
  asFiltersByRuleTypeAndConsumer,
  asFiltersBySpaceId,
  AlertingAuthorizationFilterOpts,
} from './alerting_authorization_kuery';

export enum AlertingAuthorizationEntity {
  Rule = 'rule',
  Alert = 'alert',
}

export enum ReadOperations {
  Get = 'get',
  GetRuleState = 'getRuleState',
  GetAlertSummary = 'getAlertSummary',
  GetExecutionLog = 'getExecutionLog',
  GetExecutionErrors = 'getExecutionErrors',
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
  MuteAlert = 'muteAlert',
  UnmuteAlert = 'unmuteAlert',
  Snooze = 'snooze',
}

export interface EnsureAuthorizedOpts {
  ruleTypeId: string;
  consumer: string;
  operation: ReadOperations | WriteOperations;
  entity: AlertingAuthorizationEntity;
}

interface HasPrivileges {
  read: boolean;
  all: boolean;
}
type AuthorizedConsumers = Record<string, HasPrivileges>;
export interface RegistryAlertTypeWithAuth extends RegistryRuleType {
  authorizedConsumers: AuthorizedConsumers;
}

type IsAuthorizedAtProducerLevel = boolean;
export interface ConstructorOptions {
  ruleTypeRegistry: RuleTypeRegistry;
  request: KibanaRequest;
  features: FeaturesPluginStart;
  getSpace: (request: KibanaRequest) => Promise<Space | undefined>;
  getSpaceId: (request: KibanaRequest) => string | undefined;
  authorization?: SecurityPluginSetup['authz'];
}

export class AlertingAuthorization {
  private readonly ruleTypeRegistry: RuleTypeRegistry;
  private readonly request: KibanaRequest;
  private readonly authorization?: SecurityPluginSetup['authz'];
  private readonly featuresIds: Promise<Set<string>>;
  private readonly allPossibleConsumers: Promise<AuthorizedConsumers>;
  private readonly spaceId: string | undefined;

  constructor({
    ruleTypeRegistry,
    request,
    authorization,
    features,
    getSpace,
    getSpaceId,
  }: ConstructorOptions) {
    this.request = request;
    this.authorization = authorization;
    this.ruleTypeRegistry = ruleTypeRegistry;

    this.spaceId = getSpaceId(request);

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

    this.allPossibleConsumers = this.featuresIds.then((featuresIds) => {
      return featuresIds.size
        ? asAuthorizedConsumers([ALERTS_FEATURE_ID, ...featuresIds], {
            read: true,
            all: true,
          })
        : {};
    });
  }

  private shouldCheckAuthorization(): boolean {
    return this.authorization?.mode?.useRbacForRequest(this.request) ?? false;
  }

  public getSpaceId(): string | undefined {
    return this.spaceId;
  }

  /*
   * This method exposes the private 'augmentRuleTypesWithAuthorization' to be
   * used by the RAC/Alerts client
   */
  public async getAugmentedRuleTypesWithAuthorization(
    featureIds: readonly string[],
    operations: Array<ReadOperations | WriteOperations>,
    authorizationEntity: AlertingAuthorizationEntity
  ): Promise<{
    username?: string;
    hasAllRequested: boolean;
    authorizedRuleTypes: Set<RegistryAlertTypeWithAuth>;
  }> {
    return this.augmentRuleTypesWithAuthorization(
      this.ruleTypeRegistry.list(),
      operations,
      authorizationEntity,
      new Set(featureIds)
    );
  }

  public async ensureAuthorized({ ruleTypeId, consumer, operation, entity }: EnsureAuthorizedOpts) {
    const { authorization } = this;

    const isAvailableConsumer = has(await this.allPossibleConsumers, consumer);
    if (authorization && this.shouldCheckAuthorization()) {
      const ruleType = this.ruleTypeRegistry.get(ruleTypeId);
      const requiredPrivilegesByScope = {
        consumer: authorization.actions.alerting.get(ruleTypeId, consumer, entity, operation),
        producer: authorization.actions.alerting.get(
          ruleTypeId,
          ruleType.producer,
          entity,
          operation
        ),
      };

      // Skip authorizing consumer if consumer is the Rules Management consumer (`alerts`)
      // This means that rules and their derivative alerts created in the Rules Management UI
      // will only be subject to checking if user has access to the rule producer.
      const shouldAuthorizeConsumer = consumer !== ALERTS_FEATURE_ID;

      const checkPrivileges = authorization.checkPrivilegesDynamicallyWithRequest(this.request);
      const { hasAllRequested, privileges } = await checkPrivileges({
        kibana:
          shouldAuthorizeConsumer && consumer !== ruleType.producer
            ? [
                // check for access at consumer level
                requiredPrivilegesByScope.consumer,
                // check for access at producer level
                requiredPrivilegesByScope.producer,
              ]
            : [
                // skip consumer privilege checks under `alerts` as all rule types can
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
          getUnauthorizedMessage(ruleTypeId, ScopeType.Consumer, consumer, operation, entity)
        );
      }

      if (!hasAllRequested) {
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
          getUnauthorizedMessage(
            ruleTypeId,
            unauthorizedScopeType,
            unauthorizedScope,
            operation,
            entity
          )
        );
      }
    } else if (!isAvailableConsumer) {
      throw Boom.forbidden(
        getUnauthorizedMessage(ruleTypeId, ScopeType.Consumer, consumer, operation, entity)
      );
    }
  }

  public async getFindAuthorizationFilter(
    authorizationEntity: AlertingAuthorizationEntity,
    filterOpts: AlertingAuthorizationFilterOpts
  ): Promise<{
    filter?: KueryNode | JsonObject;
    ensureRuleTypeIsAuthorized: (ruleTypeId: string, consumer: string, auth: string) => void;
  }> {
    return this.getAuthorizationFilter(authorizationEntity, filterOpts, ReadOperations.Find);
  }

  public async getAuthorizationFilter(
    authorizationEntity: AlertingAuthorizationEntity,
    filterOpts: AlertingAuthorizationFilterOpts,
    operation: WriteOperations | ReadOperations
  ): Promise<{
    filter?: KueryNode | JsonObject;
    ensureRuleTypeIsAuthorized: (ruleTypeId: string, consumer: string, auth: string) => void;
  }> {
    if (this.authorization && this.shouldCheckAuthorization()) {
      const { authorizedRuleTypes } = await this.augmentRuleTypesWithAuthorization(
        this.ruleTypeRegistry.list(),
        [operation],
        authorizationEntity
      );

      if (!authorizedRuleTypes.size) {
        throw Boom.forbidden(`Unauthorized to find ${authorizationEntity}s for any rule types`);
      }

      const authorizedRuleTypeIdsToConsumers = new Set<string>(
        [...authorizedRuleTypes].reduce<string[]>((ruleTypeIdConsumerPairs, ruleType) => {
          for (const consumer of Object.keys(ruleType.authorizedConsumers)) {
            ruleTypeIdConsumerPairs.push(`${ruleType.id}/${consumer}/${authorizationEntity}`);
          }
          return ruleTypeIdConsumerPairs;
        }, [])
      );

      const authorizedEntries: Map<string, Set<string>> = new Map();
      return {
        filter: asFiltersByRuleTypeAndConsumer(
          authorizedRuleTypes,
          filterOpts,
          this.spaceId
        ) as JsonObject,
        ensureRuleTypeIsAuthorized: (ruleTypeId: string, consumer: string, authType: string) => {
          if (!authorizedRuleTypeIdsToConsumers.has(`${ruleTypeId}/${consumer}/${authType}`)) {
            throw Boom.forbidden(
              getUnauthorizedMessage(
                ruleTypeId,
                ScopeType.Consumer,
                consumer,
                'find',
                authorizationEntity
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
      };
    }

    return {
      filter: asFiltersBySpaceId(filterOpts, this.spaceId) as JsonObject,
      ensureRuleTypeIsAuthorized: (ruleTypeId: string, consumer: string, authType: string) => {},
    };
  }

  public async filterByRuleTypeAuthorization(
    ruleTypes: Set<RegistryRuleType>,
    operations: Array<ReadOperations | WriteOperations>,
    authorizationEntity: AlertingAuthorizationEntity
  ): Promise<Set<RegistryAlertTypeWithAuth>> {
    const { authorizedRuleTypes } = await this.augmentRuleTypesWithAuthorization(
      ruleTypes,
      operations,
      authorizationEntity
    );
    return authorizedRuleTypes;
  }

  private async augmentRuleTypesWithAuthorization(
    ruleTypes: Set<RegistryRuleType>,
    operations: Array<ReadOperations | WriteOperations>,
    authorizationEntity: AlertingAuthorizationEntity,
    featuresIds?: Set<string>
  ): Promise<{
    username?: string;
    hasAllRequested: boolean;
    authorizedRuleTypes: Set<RegistryAlertTypeWithAuth>;
  }> {
    const fIds = featuresIds ?? (await this.featuresIds);
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
      // and ruleType in the system whether this user has this privilege
      for (const ruleType of ruleTypesWithAuthorization) {
        for (const feature of fIds) {
          for (const operation of operations) {
            privilegeToRuleType.set(
              this.authorization!.actions.alerting.get(
                ruleType.id,
                feature,
                authorizationEntity,
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
                const [ruleType, feature, hasPrivileges, isAuthorizedAtProducerLevel] =
                  privilegeToRuleType.get(privilege)!;
                ruleType.authorizedConsumers[feature] = mergeHasPrivileges(
                  hasPrivileges,
                  ruleType.authorizedConsumers[feature]
                );

                if (isAuthorizedAtProducerLevel) {
                  // granting privileges under the producer automatically authorized the Rules Management UI as well
                  ruleType.authorizedConsumers[ALERTS_FEATURE_ID] = mergeHasPrivileges(
                    hasPrivileges,
                    ruleType.authorizedConsumers[ALERTS_FEATURE_ID]
                  );
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
          new Set([...ruleTypes].filter((ruleType) => fIds.has(ruleType.producer))),
          await this.allPossibleConsumers
        ),
      };
    }
  }

  private augmentWithAuthorizedConsumers(
    ruleTypes: Set<RegistryRuleType>,
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
  const read = Object.values(ReadOperations).includes(operation as unknown as ReadOperations);
  const all = Object.values(WriteOperations).includes(operation as unknown as WriteOperations);
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

enum ScopeType {
  Consumer,
  Producer,
}

function getUnauthorizedMessage(
  alertTypeId: string,
  scopeType: ScopeType,
  scope: string,
  operation: string,
  entity: string
): string {
  return `Unauthorized to ${operation} a "${alertTypeId}" ${entity} ${
    scopeType === ScopeType.Consumer ? `for "${scope}"` : `by "${scope}"`
  }`;
}
