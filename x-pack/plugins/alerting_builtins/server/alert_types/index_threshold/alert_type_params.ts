/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { CoreQueryParamsSchemaProperties, validateCoreQueryBody } from './lib/core_query_types';

// alert type parameters

export type Params = TypeOf<typeof ParamsSchema>;

export const ParamsSchema = schema.object(
  {
    ...CoreQueryParamsSchemaProperties,
    // the comparison function to use to determine if the threshold as been met
    comparator: schema.string({ validate: validateComparator }),
    // the values to use as the threshold; `between` and `notBetween` require
    // two values, the others require one.
    threshold: schema.arrayOf(schema.number(), { minSize: 1, maxSize: 2 }),
  },
  {
    validate: validateParams,
  }
);

const betweenComparators = new Set(['between', 'notBetween']);

// using direct type not allowed, circular reference, so body is typed to any
function validateParams(anyParams: any): string | undefined {
  // validate core query parts, return if it fails validation (returning string)
  const coreQueryValidated = validateCoreQueryBody(anyParams);
  if (coreQueryValidated) return coreQueryValidated;

  const { comparator, threshold }: Params = anyParams;

  if (betweenComparators.has(comparator)) {
    if (threshold.length === 1) {
      return `[threshold]: must have two elements for the "${comparator}" comparator`;
    }
  } else {
    if (threshold.length === 2) {
      return `[threshold]: must have one element for the "${comparator}" comparator`;
    }
  }
}

const Comparators = new Set([
  'lessThan',
  'lessThanOrEqual',
  'greaterThanOrEqual',
  'greaterThan',
  'between',
  'notBetween',
]);

function validateComparator(comparator: string) {
  if (Comparators.has(comparator)) return;

  const comparators = Array.from(Comparators).join(', ');
  return `must be one of ${comparators}`;
}
