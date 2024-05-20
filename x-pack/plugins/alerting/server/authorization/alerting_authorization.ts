/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { has, isEmpty } from 'lodash';
import { KibanaRequest } from '@kbn/core/server';
import { JsonObject } from '@kbn/utility-types';
import { KueryNode } from '@kbn/es-query';
import { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { PluginStartContract as FeaturesPluginStart } from '@kbn/features-plugin/server';
import { Space } from '@kbn/spaces-plugin/server';
import { RegistryRuleType } from '../rule_type_registry';
import { ALERTING_FEATURE_ID, RuleTypeRegistry } from '../types';
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
  GetActionErrorLog = 'getActionErrorLog',
  Find = 'find',
  GetAuthorizedAlertsIndices = 'getAuthorizedAlertsIndices',
  GetRuleExecutionKPI = 'getRuleExecutionKPI',
  GetBackfill = 'getBackfill',
  FindBackfill = 'findBackfill',
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
  BulkEdit = 'bulkEdit',
  BulkDelete = 'bulkDelete',
  BulkEnable = 'bulkEnable',
  BulkDisable = 'bulkDisable',
  Unsnooze = 'unsnooze',
  RunSoon = 'runSoon',
  ScheduleBackfill = 'scheduleBackfill',
  DeleteBackfill = 'deleteBackfill',
}

export interface EnsureAuthorizedOpts {
  ruleTypeId: string;
  consumer: string;
  operation: ReadOperations | WriteOperations;
  entity: AlertingAuthorizationEntity;
  additionalPrivileges?: string[];
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

    const alertingFeaturesPromise = getSpace(request)
      .then((maybeSpace) => new Set(maybeSpace?.disabledFeatures ?? []))
      .then((disabledFeatures) =>
        features.getKibanaFeatures().filter(
          ({ id, alerting }) =>
            // ignore features which are disabled in the user's space
            !disabledFeatures.has(id) &&
            // ignore features which don't grant privileges to alerting
            ((alerting?.ruleTypeIds?.length ?? 0 > 0) || (alerting?.consumers?.length ?? 0 > 0))
        )
      );

    this.allPossibleConsumers = alertingFeaturesPromise.then((alertingFeatures) => {
      const consumers = alertingFeatures
        .flatMap((alertingFeature) => alertingFeature.alerting?.consumers)
        .filter(Boolean) as string[];

      return consumers.length
        ? asAuthorizedConsumers([ALERTING_FEATURE_ID, ...consumers], {
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

  public async ensureAuthorized({
    ruleTypeId,
    consumer: legacyConsumer,
    operation,
    entity,
    additionalPrivileges = [],
  }: EnsureAuthorizedOpts) {
    const { authorization } = this;
    const ruleType = this.ruleTypeRegistry.get(ruleTypeId);
    const consumer = getValidConsumer({
      validLegacyConsumers: ruleType.validLegacyConsumers,
      legacyConsumer,
      producer: ruleType.producer,
    });

    const isAvailableConsumer = has(await this.allPossibleConsumers, consumer);
    if (authorization && this.shouldCheckAuthorization()) {
      const checkPrivileges = authorization.checkPrivilegesDynamicallyWithRequest(this.request);

      const { hasAllRequested } = await checkPrivileges({
        kibana: [
          authorization.actions.alerting.get(ruleTypeId, consumer, entity, operation),
          ...additionalPrivileges,
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
        throw Boom.forbidden(getUnauthorizedMessage(ruleTypeId, legacyConsumer, operation, entity));
      }

      if (!hasAllRequested) {
        throw Boom.forbidden(getUnauthorizedMessage(ruleTypeId, consumer, operation, entity));
      }
    } else if (!isAvailableConsumer) {
      throw Boom.forbidden(getUnauthorizedMessage(ruleTypeId, consumer, operation, entity));
    }
  }

  public async getFindAuthorizationFilter(
    authorizationEntity: AlertingAuthorizationEntity,
    filterOpts: AlertingAuthorizationFilterOpts,
    featuresIds?: Set<string>
  ): Promise<{
    filter?: KueryNode | JsonObject;
    ensureRuleTypeIsAuthorized: (ruleTypeId: string, consumer: string, auth: string) => void;
  }> {
    return this.getAuthorizationFilter(
      authorizationEntity,
      filterOpts,
      ReadOperations.Find,
      featuresIds
    );
  }

  public async getAuthorizedRuleTypes(
    authorizationEntity: AlertingAuthorizationEntity,
    featuresIds?: Set<string>
  ): Promise<RegistryAlertTypeWithAuth[]> {
    const { authorizedRuleTypes } = await this.augmentRuleTypesWithAuthorization(
      this.ruleTypeRegistry.list(),
      [ReadOperations.Find],
      authorizationEntity,
      featuresIds
    );
    return Array.from(authorizedRuleTypes);
  }

  public async getAuthorizationFilter(
    authorizationEntity: AlertingAuthorizationEntity,
    filterOpts: AlertingAuthorizationFilterOpts,
    operation: WriteOperations | ReadOperations,
    featuresIds?: Set<string>
  ): Promise<{
    filter?: KueryNode | JsonObject;
    ensureRuleTypeIsAuthorized: (ruleTypeId: string, consumer: string, auth: string) => void;
  }> {
    if (this.authorization && this.shouldCheckAuthorization()) {
      const { authorizedRuleTypes } = await this.augmentRuleTypesWithAuthorization(
        this.ruleTypeRegistry.list(),
        [operation],
        authorizationEntity,
        featuresIds
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
              getUnauthorizedMessage(ruleTypeId, consumer, 'find', authorizationEntity)
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
    consumers?: Set<string>
  ): Promise<{
    username?: string;
    hasAllRequested: boolean;
    authorizedRuleTypes: Set<RegistryAlertTypeWithAuth>;
  }> {
    const allPossibleConsumers = await this.allPossibleConsumers;
    const consumersToAuthorize = consumers ?? new Set(Object.keys(allPossibleConsumers));
    const requiredPrivileges = new Map<
      string,
      [RegistryAlertTypeWithAuth, string, HasPrivileges, IsAuthorizedAtProducerLevel]
    >();
    const authorizedRuleTypes = new Set<RegistryAlertTypeWithAuth>();

    const addLegacyConsumerPrivileges = (legacyConsumer: string) =>
      legacyConsumer === ALERTING_FEATURE_ID || isEmpty(consumers);

    if (this.authorization && this.shouldCheckAuthorization()) {
      const checkPrivileges = this.authorization.checkPrivilegesDynamicallyWithRequest(
        this.request
      );

      const ruleTypesWithAuthorization = Array.from(
        this.augmentWithAuthorizedConsumers(ruleTypes, {})
      );

      for (const ruleTypeWithAuth of ruleTypesWithAuthorization) {
        for (const consumerToAuthorize of consumersToAuthorize) {
          for (const operation of operations) {
            requiredPrivileges.set(
              this.authorization!.actions.alerting.get(
                ruleTypeWithAuth.id,
                consumerToAuthorize,
                authorizationEntity,
                operation
              ),
              [
                ruleTypeWithAuth,
                consumerToAuthorize,
                hasPrivilegeByOperation(operation),
                ruleTypeWithAuth.producer === consumerToAuthorize,
              ]
            );

            // FUTURE ENGINEER
            // We are just trying to add back the legacy consumers associated
            // to the rule type to get back the privileges that was given at one point
            if (!isEmpty(ruleTypeWithAuth.validLegacyConsumers)) {
              ruleTypeWithAuth.validLegacyConsumers.forEach((legacyConsumer) => {
                if (addLegacyConsumerPrivileges(legacyConsumer)) {
                  if (!allPossibleConsumers[legacyConsumer]) {
                    allPossibleConsumers[legacyConsumer] = {
                      read: true,
                      all: true,
                    };
                  }

                  requiredPrivileges.set(
                    this.authorization!.actions.alerting.get(
                      ruleTypeWithAuth.id,
                      legacyConsumer,
                      authorizationEntity,
                      operation
                    ),
                    [ruleTypeWithAuth, legacyConsumer, hasPrivilegeByOperation(operation), false]
                  );
                }
              });
            }
          }
        }
      }

      const { username, hasAllRequested, privileges } = await checkPrivileges({
        kibana: [...requiredPrivileges.keys()],
      });

      for (const { authorized, privilege } of privileges.kibana) {
        if (authorized && requiredPrivileges.has(privilege)) {
          const [ruleType, consumer, hasPrivileges, isAuthorizedAtProducerLevel] =
            requiredPrivileges.get(privilege)!;

          if (consumersToAuthorize.has(consumer)) {
            ruleType.authorizedConsumers[consumer] = mergeHasPrivileges(
              hasPrivileges,
              ruleType.authorizedConsumers[consumer]
            );

            if (isAuthorizedAtProducerLevel) {
              // granting privileges under the producer automatically authorized the Rules Management UI as well
              ruleType.validLegacyConsumers.forEach((legacyConsumer) => {
                if (addLegacyConsumerPrivileges(legacyConsumer)) {
                  ruleType.authorizedConsumers[legacyConsumer] = mergeHasPrivileges(
                    hasPrivileges,
                    ruleType.authorizedConsumers[legacyConsumer]
                  );
                }
              });
            }

            authorizedRuleTypes.add(ruleType);
          }
        }
      }

      return {
        username,
        hasAllRequested,
        authorizedRuleTypes:
          hasAllRequested && consumers === undefined
            ? // has access to all features
              this.augmentWithAuthorizedConsumers(authorizedRuleTypes, allPossibleConsumers)
            : authorizedRuleTypes,
      };
    } else {
      return {
        hasAllRequested: true,
        authorizedRuleTypes: this.augmentWithAuthorizedConsumers(
          new Set([...ruleTypes].filter((ruleType) => consumersToAuthorize.has(ruleType.producer))),
          allPossibleConsumers
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
  return consumers.reduce<AuthorizedConsumers>((acc, feature) => {
    acc[feature] = hasPrivileges;
    return acc;
  }, {});
}

function getUnauthorizedMessage(
  alertTypeId: string,
  scope: string,
  operation: string,
  entity: string
): string {
  return `Unauthorized by "${scope}" to ${operation} "${alertTypeId}" ${entity}`;
}

export const getValidConsumer = ({
  validLegacyConsumers,
  legacyConsumer,
  producer,
}: {
  validLegacyConsumers: string[];
  legacyConsumer: string;
  producer: string;
}): string =>
  legacyConsumer === ALERTING_FEATURE_ID || validLegacyConsumers.includes(legacyConsumer)
    ? producer
    : legacyConsumer;
