/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { pluck, mapValues } from 'lodash';
import { KibanaRequest } from 'src/core/server';
import { AlertsFeatureId } from '../../common';
import { AlertTypeRegistry } from '../types';
import { SecurityPluginSetup } from '../../../security/server';
import { RegistryAlertType } from '../alert_type_registry';
import { PluginStartContract as FeaturesPluginStart } from '../../../features/server';
import { AlertsAuthorizationAuditLogger, ScopeType, AuthorizationResult } from './audit_logger';

export interface RegistryAlertTypeWithAuth extends RegistryAlertType {
  authorizedConsumers: string[];
}

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

  public async ensureAuthorized(alertTypeId: string, consumer: string, operation: string) {
    const { authorization } = this;
    if (authorization) {
      const alertType = this.alertTypeRegistry.get(alertTypeId);
      const requiredPrivilegesByScope = {
        consumer: authorization.actions.alerting.get(alertTypeId, consumer, operation),
        producer: authorization.actions.alerting.get(alertTypeId, alertType.producer, operation),
      };

      // We special case the Alerts Management `consumer` as we don't want to have to
      // manually authorize each alert type in the management UI
      const shouldAuthorizeConsumer = consumer !== AlertsFeatureId;

      const checkPrivileges = authorization.checkPrivilegesDynamicallyWithRequest(this.request);
      const { hasAllRequested, username, privileges } = await checkPrivileges(
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
            ]
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

  public async getFindAuthorizationFilter(): Promise<{
    filter?: string;
    ensureAlertTypeIsAuthorized: (alertTypeId: string, consumer: string) => void;
  }> {
    if (this.authorization) {
      const { username, authorizedAlertTypes } = await this.augmentAlertTypesWithAuthorization(
        this.alertTypeRegistry.list(),
        'find'
      );

      if (!authorizedAlertTypes.size) {
        throw Boom.forbidden(
          this.auditLogger.alertsUnscopedAuthorizationFailure(username!, 'find')
        );
      }

      const authorizedAlertTypeIdsToConsumers = new Set<string>(
        [...authorizedAlertTypes].reduce<string[]>((alertTypeIdConsumerPairs, alertType) => {
          for (const consumer of alertType.authorizedConsumers) {
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

  public async checkAlertTypeAuthorization(
    alertTypes: Set<RegistryAlertType>,
    operation: string
  ): Promise<Set<RegistryAlertTypeWithAuth>> {
    const { authorizedAlertTypes } = await this.augmentAlertTypesWithAuthorization(
      alertTypes,
      operation
    );
    return authorizedAlertTypes;
  }

  private async augmentAlertTypesWithAuthorization(
    alertTypes: Set<RegistryAlertType>,
    operation: string
  ): Promise<{
    username?: string;
    hasAllRequested: boolean;
    authorizedAlertTypes: Set<RegistryAlertTypeWithAuth>;
  }> {
    const featuresIds = this.features.getFeatures().map((feature) => feature.id);
    if (!this.authorization) {
      return {
        hasAllRequested: true,
        authorizedAlertTypes: this.augmentWithAuthorizedConsumers(alertTypes, featuresIds),
      };
    } else {
      const checkPrivileges = this.authorization.checkPrivilegesDynamicallyWithRequest(
        this.request
      );

      // add an empty `authorizedConsumers` array on each alertType
      const alertTypesWithAutherization = this.augmentWithAuthorizedConsumers(alertTypes);

      // map from privilege to alertType which we can refer back to when analyzing the result
      // of checkPrivileges
      const privilegeToAlertType = new Map<string, [RegistryAlertTypeWithAuth, string]>();
      // as we can't ask ES for the user's individual privileges we need to ask for each feature
      // and alertType in the system whether this user has this privilege
      for (const alertType of alertTypesWithAutherization) {
        for (const feature of featuresIds) {
          privilegeToAlertType.set(
            this.authorization!.actions.alerting.get(alertType.id, feature, operation),
            [alertType, feature]
          );
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
            this.augmentWithAuthorizedConsumers(alertTypes, featuresIds)
          : // only has some of the required privileges
            privileges.reduce((authorizedAlertTypes, { authorized, privilege }) => {
              if (authorized && privilegeToAlertType.has(privilege)) {
                const [alertType, consumer] = privilegeToAlertType.get(privilege)!;
                alertType.authorizedConsumers.push(consumer);
                authorizedAlertTypes.add(alertType);
              }
              return authorizedAlertTypes;
            }, new Set<RegistryAlertTypeWithAuth>()),
      };
    }
  }

  private augmentWithAuthorizedConsumers(
    alertTypes: Set<RegistryAlertType>,
    authorizedConsumers?: string[]
  ): Set<RegistryAlertTypeWithAuth> {
    return new Set(
      Array.from(alertTypes).map((alertType) => ({
        ...alertType,
        authorizedConsumers: authorizedConsumers ?? [],
      }))
    );
  }

  private asFiltersByAlertTypeAndConsumer(alertTypes: Set<RegistryAlertTypeWithAuth>): string[] {
    return Array.from(alertTypes).reduce<string[]>((filters, { id, authorizedConsumers }) => {
      filters.push(
        `(alert.attributes.alertTypeId:${id} and (${authorizedConsumers
          .map((consumer) => `alert.attributes.consumer:${consumer}`)
          .join(' or ')}))`
      );
      return filters;
    }, []);
  }
}
