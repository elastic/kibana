/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { AlertType as RuleType } from '../../common';
import { AlertNavigationHandler } from './types';

const DEFAULT_HANDLER = Symbol('*');
export class AlertNavigationRegistry {
  private readonly alertNavigations: Map<string, Map<string | symbol, AlertNavigationHandler>> =
    new Map();

  public has(consumer: string, ruleType: RuleType) {
    return this.hasTypedHandler(consumer, ruleType) || this.hasDefaultHandler(consumer);
  }

  public hasTypedHandler(consumer: string, ruleType: RuleType) {
    return this.alertNavigations.get(consumer)?.has(ruleType.id) ?? false;
  }

  public hasDefaultHandler(consumer: string) {
    return this.alertNavigations.get(consumer)?.has(DEFAULT_HANDLER) ?? false;
  }

  private createConsumerNavigation(consumer: string) {
    const consumerNavigations = new Map<string, AlertNavigationHandler>();
    this.alertNavigations.set(consumer, consumerNavigations);
    return consumerNavigations;
  }

  public registerDefault(consumer: string, handler: AlertNavigationHandler) {
    if (this.hasDefaultHandler(consumer)) {
      throw new Error(
        i18n.translate('xpack.alerting.alertNavigationRegistry.register.duplicateDefaultError', {
          defaultMessage: 'Default Navigation within "{consumer}" is already registered.',
          values: {
            consumer,
          },
        })
      );
    }

    const consumerNavigations =
      this.alertNavigations.get(consumer) ?? this.createConsumerNavigation(consumer);

    consumerNavigations.set(DEFAULT_HANDLER, handler);
  }

  public register(consumer: string, ruleType: RuleType, handler: AlertNavigationHandler) {
    if (this.hasTypedHandler(consumer, ruleType)) {
      throw new Error(
        i18n.translate(
          'xpack.alerting.alertNavigationRegistry.register.duplicateRuleTypeNavigationError',
          {
            defaultMessage:
              'Navigation for Rule type "{ruleTypeId}" within "{consumer}" is already registered.',
            values: {
              ruleTypeId: ruleType.id,
              consumer,
            },
          }
        )
      );
    }

    const consumerNavigations =
      this.alertNavigations.get(consumer) ?? this.createConsumerNavigation(consumer);

    consumerNavigations.set(ruleType.id, handler);
  }

  public get(consumer: string, ruleType: RuleType): AlertNavigationHandler {
    if (this.has(consumer, ruleType)) {
      const consumerHandlers = this.alertNavigations.get(consumer)!;
      return (consumerHandlers.get(ruleType.id) ?? consumerHandlers.get(DEFAULT_HANDLER))!;
    }

    throw new Error(
      i18n.translate('xpack.alerting.alertNavigationRegistry.get.missingNavigationError', {
        defaultMessage:
          'Navigation for Rule type "{ruleTypeId}" within "{consumer}" is not registered.',
        values: {
          ruleTypeId: ruleType.id,
          consumer,
        },
      })
    );
  }
}
