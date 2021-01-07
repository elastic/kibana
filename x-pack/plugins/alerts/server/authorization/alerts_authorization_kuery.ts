/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { remove } from 'lodash';
import { nodeBuilder } from '../../../../../src/plugins/data/common';
import { KueryNode } from '../../../../../src/plugins/data/server';
import { RegistryAlertTypeWithAuth } from './alerts_authorization';

export function asFiltersByAlertTypeAndConsumer(
  alertTypes: Set<RegistryAlertTypeWithAuth>
): KueryNode {
  return nodeBuilder.or(
    Array.from(alertTypes).reduce<KueryNode[]>((filters, { id, authorizedConsumers }) => {
      ensureFieldIsSafeForQuery('alertTypeId', id);
      filters.push(
        nodeBuilder.and([
          nodeBuilder.is(`alert.attributes.alertTypeId`, id),
          nodeBuilder.or(
            Object.keys(authorizedConsumers).map((consumer) => {
              ensureFieldIsSafeForQuery('consumer', consumer);
              return nodeBuilder.is(`alert.attributes.consumer`, consumer);
            })
          ),
        ])
      );
      return filters;
    }, [])
  );
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
