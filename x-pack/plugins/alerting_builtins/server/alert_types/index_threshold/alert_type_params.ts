/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';
import { ComparatorFnNames, getInvalidComparatorMessage } from './alert_type';
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
      return i18n.translate('xpack.alertingBuiltins.indexThreshold.invalidThreshold2ErrorMessage', {
        defaultMessage: '[threshold]: must have two elements for the "{comparator}" comparator',
        values: {
          comparator,
        },
      });
    }
  } else {
    if (threshold.length === 2) {
      return i18n.translate('xpack.alertingBuiltins.indexThreshold.invalidThreshold1ErrorMessage', {
        defaultMessage: '[threshold]: must have one element for the "{comparator}" comparator',
        values: {
          comparator,
        },
      });
    }
  }
}

export function validateComparator(comparator: string): string | undefined {
  if (ComparatorFnNames.has(comparator)) return;

  return getInvalidComparatorMessage(comparator);
}
