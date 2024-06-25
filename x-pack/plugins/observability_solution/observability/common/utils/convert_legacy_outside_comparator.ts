/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { COMPARATORS } from '@kbn/alerting-comparators';

export enum LEGACY_COMPARATORS {
  OUTSIDE_RANGE = 'outside',
}
export type LegacyComparator = COMPARATORS | LEGACY_COMPARATORS;

export function convertToBuiltInComparators(comparator: LegacyComparator): COMPARATORS {
  if (comparator === LEGACY_COMPARATORS.OUTSIDE_RANGE) return COMPARATORS.NOT_BETWEEN;
  return comparator;
}
