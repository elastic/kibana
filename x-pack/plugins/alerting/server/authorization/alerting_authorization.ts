/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { KibanaRequest } from '@kbn/core/server';
import { JsonObject } from '@kbn/utility-types';
import { KueryNode } from '@kbn/es-query';
import { SecurityPluginStart } from '@kbn/security-plugin/server';
import { FeaturesPluginStart } from '@kbn/features-plugin/server';
import { Space } from '@kbn/spaces-plugin/server';
import { RegistryRuleType } from '../rule_type_registry';
import { RuleTypeRegistry } from '../types';
import {
  asFiltersByRuleTypeAndConsumer,
  asFiltersBySpaceId,
  AlertingAuthorizationFilterOpts,
} from './alerting_authorization_kuery';
import { ReadOperations, WriteOperations, AlertingAuthorizationEntity } from './types';

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

export type AuthorizedRuleTypes = Map<string, { authorizedConsumers: AuthorizedConsumers }>;

export interface CreateOptions {
  ruleTypeRegistry: RuleTypeRegistry;
  request: KibanaRequest;
  features: FeaturesPluginStart;
  getSpace: (request: KibanaRequest) => Promise<Space | undefined>;
  getSpaceId: (request: KibanaRequest) => string | undefined;
  authorization?: SecurityPluginStart['authz'];
}

type ConstructorOptions = Pick<
  CreateOptions,
  'ruleTypeRegistry' | 'request' | 'authorization' | 'getSpaceId'
> & {
  allRegisteredConsumers: Set<string>;
  ruleTypesConsumersMap: Map<string, Set<string>>;
};

interface GetAuthorizationFilterParams {
  authorizationEntity: AlertingAuthorizationEntity;
  filterOpts: AlertingAuthorizationFilterOpts;
  operation: WriteOperations | ReadOperations;
  ruleTypeIds?: string[];
}

interface GetAuthorizedRuleTypesWithAuthorizedConsumersParams {
  ruleTypeIds?: string[];
  operations: Array<ReadOperations | WriteOperations>;
  authorizationEntity: AlertingAuthorizationEntity;
}

interface GetAllAuthorizedRuleTypesFindOperationParams {
  authorizationEntity: AlertingAuthorizationEntity;
  ruleTypeIds?: string[];
}

interface GetFindAuthorizationFilterParams {
  authorizationEntity: AlertingAuthorizationEntity;
  filterOpts: AlertingAuthorizationFilterOpts;
  ruleTypeIds?: string[];
}

interface GetAuthorizedRuleTypesParams {
  ruleTypeIds?: string[];
  operations: Array<ReadOperations | WriteOperations>;
  authorizationEntity: AlertingAuthorizationEntity;
}

interface GetAllAuthorizedRuleTypes {
  operations: Array<ReadOperations | WriteOperations>;
  authorizationEntity: AlertingAuthorizationEntity;
}

export class AlertingAuthorization {
  private readonly ruleTypeRegistry: RuleTypeRegistry;
  private readonly request: KibanaRequest;
  private readonly authorization?: SecurityPluginStart['authz'];
  private readonly allRegisteredConsumers: Set<string>;
  private readonly ruleTypesConsumersMap: Map<string, Set<string>>;
  private readonly spaceId: string | undefined;

  constructor({
    ruleTypeRegistry,
    request,
    authorization,
    getSpaceId,
    allRegisteredConsumers,
    ruleTypesConsumersMap,
  }: ConstructorOptions) {
    this.request = request;
    this.authorization = authorization;
    this.ruleTypeRegistry = ruleTypeRegistry;
    this.allRegisteredConsumers = allRegisteredConsumers;
    this.ruleTypesConsumersMap = ruleTypesConsumersMap;
    this.spaceId = getSpaceId(request);
  }

  /**
   * Creates an AlertingAuthorization object.
   */
  static async create({
    request,
    features,
    getSpace,
    getSpaceId,
    authorization,
    ruleTypeRegistry,
  }: CreateOptions): Promise<AlertingAuthorization> {
    const allRegisteredConsumers = new Set<string>();
    const ruleTypesConsumersMap = new Map<string, Set<string>>();
    let maybeSpace;

    try {
      maybeSpace = await getSpace(request);
    } catch (error) {
      if (Boom.isBoom(error) && error.output.statusCode === 403) {
        return new AlertingAuthorization({
          request,
          authorization,
          getSpaceId,
          ruleTypeRegistry,
          allRegisteredConsumers,
          ruleTypesConsumersMap,
        });
      }

      if (Boom.isBoom(error)) {
        throw error;
      }

      throw new Error(`Failed to create AlertingAuthorization class: ${error}`);
    }

    const disabledFeatures = new Set(maybeSpace?.disabledFeatures ?? []);
    const featuresWithAlertingConfigured = features.getKibanaFeatures().filter(
      ({ id, alerting }) =>
        // ignore features which are disabled in the user's space
        !disabledFeatures.has(id) &&
        // ignore features which don't grant privileges to alerting
        Boolean(alerting?.length)
    );

    /**
     * Each feature configures a set of rule types. Each
     * rule type configures its valid consumers. For example,
     *
     * { id: 'my-feature-id-1', alerting: [{ ruleTypeId: 'my-rule-type', consumers: ['consumer-a', 'consumer-b'] }] }
     * { id: 'my-feature-id-2', alerting: [{ ruleTypeId: 'my-rule-type-2', consumers: ['consumer-a', 'consumer-d'] }] }
     *
     * In this loop we iterate over all features and we construct:
     * a) a set that contains all registered consumers and
     * b) a map that contains all valid consumers per rule type.
     * We remove duplicates in the process. For example,
     *
     * allRegisteredConsumers: Set(1) { 'consumer-a', 'consumer-b', 'consumer-d' }
     * ruleTypesConsumersMap: Map(1) {
     *  'my-rule-type' => Set(1) { 'consumer-a', 'consumer-b' }
     *  'my-rule-type-2' => Set(1) { 'consumer-a', 'consumer-d' }
     * }
     */
    for (const feature of featuresWithAlertingConfigured) {
      if (feature.alerting) {
        for (const entry of feature.alerting) {
          const consumers = ruleTypesConsumersMap.get(entry.ruleTypeId) ?? new Set();

          entry.consumers.forEach((consumer) => {
            consumers.add(consumer);
            allRegisteredConsumers.add(consumer);
          });
          ruleTypesConsumersMap.set(entry.ruleTypeId, consumers);
        }
      }
    }

    return new AlertingAuthorization({
      request,
      authorization,
      getSpaceId,
      ruleTypeRegistry,
      allRegisteredConsumers,
      ruleTypesConsumersMap,
    });
  }

  private shouldCheckAuthorization(): boolean {
    return this.authorization?.mode?.useRbacForRequest(this.request) ?? false;
  }

  public getSpaceId(): string | undefined {
    return this.spaceId;
  }

  /*
   * This method exposes the private '_getAuthorizedRuleTypesWithAuthorizedConsumers' to be
   * used by the RAC/Alerts client
   */
  public async getAllAuthorizedRuleTypes(params: GetAllAuthorizedRuleTypes): Promise<{
    username?: string;
    hasAllRequested: boolean;
    authorizedRuleTypes: AuthorizedRuleTypes;
  }> {
    return this._getAuthorizedRuleTypesWithAuthorizedConsumers({
      operations: params.operations,
      authorizationEntity: params.authorizationEntity,
    });
  }

  public async ensureAuthorized({
    ruleTypeId,
    consumer,
    operation,
    entity,
    additionalPrivileges = [],
  }: EnsureAuthorizedOpts) {
    const { authorization } = this;

    const isAvailableConsumer = this.allRegisteredConsumers.has(consumer);
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
        throw Boom.forbidden(getUnauthorizedMessage(ruleTypeId, consumer, operation, entity));
      }

      if (!hasAllRequested) {
        throw Boom.forbidden(getUnauthorizedMessage(ruleTypeId, consumer, operation, entity));
      }
    } else if (!isAvailableConsumer) {
      throw Boom.forbidden(getUnauthorizedMessage(ruleTypeId, consumer, operation, entity));
    }
  }

  public async getFindAuthorizationFilter(params: GetFindAuthorizationFilterParams): Promise<{
    filter?: KueryNode | JsonObject;
    ensureRuleTypeIsAuthorized: (ruleTypeId: string, consumer: string, auth: string) => void;
  }> {
    return this.getAuthorizationFilter({
      ruleTypeIds: params.ruleTypeIds,
      operation: ReadOperations.Find,
      authorizationEntity: params.authorizationEntity,
      filterOpts: params.filterOpts,
    });
  }

  public async getAllAuthorizedRuleTypesFindOperation(
    params: GetAllAuthorizedRuleTypesFindOperationParams
  ): Promise<AuthorizedRuleTypes> {
    const { authorizedRuleTypes } = await this._getAuthorizedRuleTypesWithAuthorizedConsumers({
      ruleTypeIds: params.ruleTypeIds,
      operations: [ReadOperations.Find],
      authorizationEntity: params.authorizationEntity,
    });

    return authorizedRuleTypes;
  }

  public async getAuthorizationFilter(params: GetAuthorizationFilterParams): Promise<{
    filter?: KueryNode | JsonObject;
    ensureRuleTypeIsAuthorized: (ruleTypeId: string, consumer: string, auth: string) => void;
  }> {
    if (this.authorization && this.shouldCheckAuthorization()) {
      const { authorizedRuleTypes } = await this._getAuthorizedRuleTypesWithAuthorizedConsumers({
        ruleTypeIds: params.ruleTypeIds,
        operations: [params.operation],
        authorizationEntity: params.authorizationEntity,
      });

      if (!authorizedRuleTypes.size) {
        throw Boom.forbidden(
          `Unauthorized to ${params.operation} ${params.authorizationEntity}s for any rule types`
        );
      }

      return {
        filter: asFiltersByRuleTypeAndConsumer(
          authorizedRuleTypes,
          params.filterOpts,
          this.spaceId
        ) as JsonObject,
        ensureRuleTypeIsAuthorized: (ruleTypeId: string, consumer: string, authType: string) => {
          if (!authorizedRuleTypes.has(ruleTypeId) || authType !== params.authorizationEntity) {
            throw Boom.forbidden(
              getUnauthorizedMessage(ruleTypeId, consumer, params.operation, authType)
            );
          }

          const authorizedRuleType = authorizedRuleTypes.get(ruleTypeId)!;
          const authorizedConsumers = authorizedRuleType.authorizedConsumers;

          if (!authorizedConsumers[consumer]) {
            throw Boom.forbidden(
              getUnauthorizedMessage(
                ruleTypeId,
                consumer,
                params.operation,
                params.authorizationEntity
              )
            );
          }
        },
      };
    }

    return {
      filter: asFiltersBySpaceId(params.filterOpts, this.spaceId) as JsonObject,
      ensureRuleTypeIsAuthorized: (ruleTypeId: string, consumer: string, authType: string) => {},
    };
  }

  public async getAuthorizedRuleTypes(
    params: GetAuthorizedRuleTypesParams
  ): Promise<AuthorizedRuleTypes> {
    const { authorizedRuleTypes } = await this._getAuthorizedRuleTypesWithAuthorizedConsumers({
      ruleTypeIds: params.ruleTypeIds,
      operations: params.operations,
      authorizationEntity: params.authorizationEntity,
    });

    return authorizedRuleTypes;
  }

  private async _getAuthorizedRuleTypesWithAuthorizedConsumers(
    params: GetAuthorizedRuleTypesWithAuthorizedConsumersParams
  ): Promise<{
    username?: string;
    hasAllRequested: boolean;
    authorizedRuleTypes: Map<string, { authorizedConsumers: AuthorizedConsumers }>;
  }> {
    const { operations, authorizationEntity } = params;
    const ruleTypeIds = params.ruleTypeIds
      ? new Set(params.ruleTypeIds)
      : new Set(this.ruleTypeRegistry.getAllTypes());

    const requiredPrivileges = new Map<
      string,
      { ruleTypeId: string; consumer: string; operation: ReadOperations | WriteOperations }
    >();

    if (this.authorization && this.shouldCheckAuthorization()) {
      const authorizedRuleTypes = new Map<string, { authorizedConsumers: AuthorizedConsumers }>();

      const checkPrivileges = this.authorization.checkPrivilegesDynamicallyWithRequest(
        this.request
      );

      for (const ruleTypeId of ruleTypeIds) {
        /**
         * Skip if the ruleTypeId is not configured in any feature
         * or it is not set in the rule type registry.
         */
        if (!this.ruleTypesConsumersMap.has(ruleTypeId) || !this.ruleTypeRegistry.has(ruleTypeId)) {
          continue;
        }

        const ruleType = this.ruleTypeRegistry.get(ruleTypeId)!;
        const ruleTypeConsumers = this.ruleTypesConsumersMap.get(ruleTypeId) ?? new Set();

        for (const consumerToAuthorize of ruleTypeConsumers) {
          for (const operation of operations) {
            requiredPrivileges.set(
              this.authorization.actions.alerting.get(
                ruleTypeId,
                consumerToAuthorize,
                authorizationEntity,
                operation
              ),
              {
                ruleTypeId: ruleType.id,
                consumer: consumerToAuthorize,
                operation,
              }
            );
          }
        }
      }

      const { username, hasAllRequested, privileges } = await checkPrivileges({
        kibana: [...requiredPrivileges.keys()],
      });

      for (const { authorized, privilege } of privileges.kibana) {
        if (authorized && requiredPrivileges.has(privilege)) {
          const { ruleTypeId, consumer, operation } = requiredPrivileges.get(privilege)!;

          const authorizedRuleType = authorizedRuleTypes.get(ruleTypeId) ?? {
            authorizedConsumers: {},
          };

          const authorizedConsumers = authorizedRuleType.authorizedConsumers;
          const mergedOperations = mergeHasPrivileges(
            getPrivilegesFromOperation(operation),
            authorizedConsumers[consumer]
          );

          authorizedRuleTypes.set(ruleTypeId, {
            authorizedConsumers: {
              ...authorizedConsumers,
              [consumer]: mergedOperations,
            },
          });
        }
      }

      return {
        username,
        hasAllRequested,
        authorizedRuleTypes,
      };
    } else {
      return {
        hasAllRequested: true,
        authorizedRuleTypes: this.getRegisteredRuleTypesWithAllRegisteredConsumers(ruleTypeIds),
      };
    }
  }

  private getRegisteredRuleTypesWithAllRegisteredConsumers(ruleTypeIds: Set<string>) {
    const authorizedRuleTypes = new Map<string, { authorizedConsumers: AuthorizedConsumers }>();
    const authorizedConsumers = getConsumersWithPrivileges(this.allRegisteredConsumers, {
      all: true,
      read: true,
    });

    Array.from(this.ruleTypesConsumersMap.keys())
      .filter((ruleTypeId) => ruleTypeIds.has(ruleTypeId))
      .forEach((ruleTypeId) => {
        authorizedRuleTypes.set(ruleTypeId, {
          authorizedConsumers,
        });
      });

    return authorizedRuleTypes;
  }
}

function mergeHasPrivileges(left: HasPrivileges, right?: HasPrivileges): HasPrivileges {
  return {
    read: (left.read || right?.read) ?? false,
    all: (left.all || right?.all) ?? false,
  };
}

function getPrivilegesFromOperation(operation: ReadOperations | WriteOperations): HasPrivileges {
  const read = Object.values(ReadOperations).includes(operation as unknown as ReadOperations);
  const all = Object.values(WriteOperations).includes(operation as unknown as WriteOperations);
  return {
    read: read || all,
    all,
  };
}

function getConsumersWithPrivileges(
  consumers: Set<string>,
  hasPrivileges: HasPrivileges
): AuthorizedConsumers {
  return Array.from(consumers).reduce<AuthorizedConsumers>((acc, feature) => {
    acc[feature] = hasPrivileges;
    return acc;
  }, {});
}

function getUnauthorizedMessage(
  ruleTypeId: string,
  scope: string,
  operation: string,
  entity: string
): string {
  return `Unauthorized by "${scope}" to ${operation} "${ruleTypeId}" ${entity}`;
}
