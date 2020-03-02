/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { i18n } from '@kbn/i18n';
import { AlertType } from '../types';
import { AlertNavigationHandler } from './types';

export class AlertNavigationRegistry {
  private readonly alertNavigations: Map<string, Map<string, AlertNavigationHandler>> = new Map();

  public has(consumer: string, alertType: AlertType) {
    return this.alertNavigations.get(consumer)?.has(alertType.id) ?? false;
  }

  private createConsumerNavigation(consumer: string) {
    const consumerNavigations = new Map<string, AlertNavigationHandler>();
    this.alertNavigations.set(consumer, consumerNavigations);
    return consumerNavigations;
  }

  public register(consumer: string, alertType: AlertType, handler: AlertNavigationHandler) {
    if (this.has(consumer, alertType)) {
      throw Boom.badRequest(
        i18n.translate('xpack.alerting.alertNavigationRegistry.register.duplicateNavigationError', {
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
    if (!this.has(consumer, alertType)) {
      throw Boom.badRequest(
        i18n.translate('xpack.alerting.alertNavigationRegistry.get.missingNavigationError', {
          defaultMessage:
            'Navigation for Alert type "{alertType}" within "{consumer}" is not registered.',
          values: {
            alertType: alertType.id,
            consumer,
          },
        })
      );
    }
    return this.alertNavigations.get(consumer)!.get(alertType.id)!;
  }
}
