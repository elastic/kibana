/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { AlertType } from '../../common';
import { AlertNavigationHandler } from './types';

const DEFAULT_HANDLER = Symbol('*');
export class AlertNavigationRegistry {
  private readonly alertNavigations: Map<
    string,
    Map<string | symbol, AlertNavigationHandler>
  > = new Map();

  public has(consumer: string, alertType: AlertType) {
    return this.hasTypedHandler(consumer, alertType) || this.hasDefaultHandler(consumer);
  }

  public hasTypedHandler(consumer: string, alertType: AlertType) {
    return this.alertNavigations.get(consumer)?.has(alertType.id) ?? false;
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
        i18n.translate('xpack.alerts.alertNavigationRegistry.register.duplicateDefaultError', {
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

  public register(consumer: string, alertType: AlertType, handler: AlertNavigationHandler) {
    if (this.hasTypedHandler(consumer, alertType)) {
      throw new Error(
        i18n.translate('xpack.alerts.alertNavigationRegistry.register.duplicateNavigationError', {
          defaultMessage:
            'Navigation for Alert type "{alertType}" within "{consumer}" is already registered.',
          values: {
            alertType: alertType.id,
            consumer,
          },
        })
      );
    }

    const consumerNavigations =
      this.alertNavigations.get(consumer) ?? this.createConsumerNavigation(consumer);

    consumerNavigations.set(alertType.id, handler);
  }

  public get(consumer: string, alertType: AlertType): AlertNavigationHandler {
    if (this.has(consumer, alertType)) {
      const consumerHandlers = this.alertNavigations.get(consumer)!;
      return (consumerHandlers.get(alertType.id) ?? consumerHandlers.get(DEFAULT_HANDLER))!;
    }

    throw new Error(
      i18n.translate('xpack.alerts.alertNavigationRegistry.get.missingNavigationError', {
        defaultMessage:
          'Navigation for Alert type "{alertType}" within "{consumer}" is not registered.',
        values: {
          alertType: alertType.id,
          consumer,
        },
      })
    );
  }
}
