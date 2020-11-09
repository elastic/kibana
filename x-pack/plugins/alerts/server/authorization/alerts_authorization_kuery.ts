/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { remove } from 'lodash';
import { nodeTypes } from '../../../../../src/plugins/data/common';
import { KueryNode } from '../../../../../src/plugins/data/server';
import { RegistryAlertTypeWithAuth } from './alerts_authorization';

export const is = (fieldName: string, value: string | KueryNode) =>
  nodeTypes.function.buildNodeWithArgumentNodes('is', [
    nodeTypes.literal.buildNode(fieldName),
    typeof value === 'string' ? nodeTypes.literal.buildNode(value) : value,
    nodeTypes.literal.buildNode(false),
  ]);

export const or = ([first, ...args]: KueryNode[]): KueryNode =>
  args.length ? nodeTypes.function.buildNode('or', [first, or(args)]) : first;

export const and = ([first, ...args]: KueryNode[]): KueryNode =>
  args.length ? nodeTypes.function.buildNode('and', [first, and(args)]) : first;

export function asFiltersByAlertTypeAndConsumer(
  alertTypes: Set<RegistryAlertTypeWithAuth>
): KueryNode {
  return or(
    Array.from(alertTypes).reduce<KueryNode[]>((filters, { id, authorizedConsumers }) => {
      ensureFieldIsSafeForQuery('alertTypeId', id);
      filters.push(
        and([
          is(`alert.attributes.alertTypeId`, id),
          or(
            Object.keys(authorizedConsumers).map((consumer) => {
              ensureFieldIsSafeForQuery('consumer', consumer);
              return is(`alert.attributes.consumer`, consumer);
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
