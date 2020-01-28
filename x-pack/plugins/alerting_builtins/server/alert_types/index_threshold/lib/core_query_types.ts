/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// common properties on time_series_query and alert_type_params

import { schema, TypeOf } from '@kbn/config-schema';

import { MAX_GROUPS } from '../../../index';
import { parseDuration } from '../../../../../alerting/server';

export const CoreQueryParamsSchemaProperties = {
  // name of the index to search
  index: schema.string({ minLength: 1 }),
  // field in index used for date/time
  timeField: schema.string({ minLength: 1 }),
  // aggregation type
  aggType: schema.string({ validate: validateAggType }),
  // aggregation field
  aggField: schema.maybe(schema.string({ minLength: 1 })),
  // group field
  groupField: schema.maybe(schema.string({ minLength: 1 })),
  // limit on number of groups returned
  groupLimit: schema.maybe(schema.number()),
  // size of time window for date range aggregations
  window: schema.string({ validate: validateDuration }),
};

const CoreQueryParamsSchema = schema.object(CoreQueryParamsSchemaProperties);
export type CoreQueryParams = TypeOf<typeof CoreQueryParamsSchema>;

// Meant to be used in a "subclass"'s schema body validator, so the
// anyParams object is assumed to have been validated with the schema
// above.
// Using direct type not allowed, circular reference, so body is typed to any.
export function validateCoreQueryBody(anyParams: any): string | undefined {
  const { aggType, aggField, groupLimit }: CoreQueryParams = anyParams;

  if (aggType === 'count' && aggField) {
    return `[aggField]: must not have a value when [aggType] is "${aggType}"`;
  }

  if (aggType !== 'count' && !aggField) {
    return `[aggField]: must have a value when [aggType] is "${aggType}"`;
  }

  // schema.number doesn't seem to check the max value ...
  if (groupLimit != null) {
    if (groupLimit <= 0) return '[groupLimit]: must be greater than 0';
    if (groupLimit > MAX_GROUPS) {
      return `[groupLimit]: must be less than or equal to ${MAX_GROUPS}`;
    }
  }
}

const AggTypes = new Set(['count', 'average', 'min', 'max', 'sum']);

function validateAggType(aggType: string): string | undefined {
  if (AggTypes.has(aggType)) return;

  const aggTypes = Array.from(AggTypes).join(', ');
  return `must be one of ${aggTypes}`;
}

function validateDuration(duration: string): string | undefined {
  try {
    parseDuration(duration);
  } catch (err) {
    return `invalid duration value "${duration}"`;
  }
}
