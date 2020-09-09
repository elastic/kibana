/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { map, mapValues, remove, fromPairs, has } from 'lodash';
import { KibanaRequest } from 'src/core/server';
import { ALERTS_FEATURE_ID } from '../../common';
import { AlertTypeRegistry } from '../types';
import { SecurityPluginSetup } from '../../../security/server';
import { RegistryAlertType } from '../alert_type_registry';
import { PluginStartContract as FeaturesPluginStart } from '../../../features/server';
import { AlertsAuthorizationAuditLogger, ScopeType } from './audit_logger';
import { Space } from '../../../spaces/server';

export function asFiltersByAlertTypeAndConsumer(
  alertTypes: Set<RegistryAlertTypeWithAuth>
): string[] {
  return `(${Array.from(alertTypes)
    .reduce<string[]>((filters, { id, authorizedConsumers }) => {
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
    }, [])
    .join(' or ')})`;
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
