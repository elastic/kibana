/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  LimitedSizeArray,
  PositiveIntegerGreaterThanZero,
  enumeration,
} from '@kbn/securitysolution-io-ts-types';

/**
 * describes how alerts will be generated for documents with missing suppress by fields
 */
export enum AlertSuppressionMissingFieldsStrategy {
  // per each document a separate alert will be created
  DoNotSuppress = 'doNotSuppress',
  // only alert will be created per suppress by bucket
  Suppress = 'suppress',
}

export type AlertSuppressionMissingFields = t.TypeOf<typeof AlertSuppressionMissingFields>;
export const AlertSuppressionMissingFields = enumeration(
  'AlertSuppressionMissingFields',
  AlertSuppressionMissingFieldsStrategy
);
export const DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY =
  AlertSuppressionMissingFieldsStrategy.Suppress;

export const AlertSuppressionGroupBy = LimitedSizeArray({
  codec: t.string,
  minSize: 1,
  maxSize: 3,
});

export const AlertSuppressionDuration = t.type({
  value: PositiveIntegerGreaterThanZero,
  unit: t.keyof({
    s: null,
    m: null,
    h: null,
  }),
});

/**
 * Schema for fields relating to alert suppression, which enables limiting the number of alerts per entity.
 * e.g. group_by: ['host.name'] would create only one alert per value of host.name. The created alert
 * contains metadata about how many other candidate alerts with the same host.name value were suppressed.
 */
export type AlertSuppression = t.TypeOf<typeof AlertSuppression>;
export const AlertSuppression = t.intersection([
  t.exact(
    t.type({
      group_by: AlertSuppressionGroupBy,
    })
  ),
  t.exact(
    t.partial({
      duration: AlertSuppressionDuration,
      missing_fields_strategy: AlertSuppressionMissingFields,
    })
  ),
]);

export type AlertSuppressionCamel = t.TypeOf<typeof AlertSuppressionCamel>;
export const AlertSuppressionCamel = t.intersection([
  t.exact(
    t.type({
      groupBy: AlertSuppressionGroupBy,
    })
  ),
  t.exact(
    t.partial({
      duration: AlertSuppressionDuration,
      missingFieldsStrategy: AlertSuppressionMissingFields,
    })
  ),
]);

export const minimumLicenseForSuppression = 'platinum';
