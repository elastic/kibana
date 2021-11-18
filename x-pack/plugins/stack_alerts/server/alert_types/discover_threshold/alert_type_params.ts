/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';
import { ComparatorFnNames } from '../lib';
import { validateTimeWindowUnits } from '../../../../triggers_actions_ui/server';
export type Params = TypeOf<typeof ParamsSchema>;

export const ParamsSchema = schema.object(
  {
    timeWindowSize: schema.number({ min: 1 }),
    // units of time window for date range aggregations
    timeWindowUnit: schema.string({ validate: validateTimeWindowUnits }),
    // the comparison function to use to determine if the threshold as been met
    thresholdComparator: schema.string({ validate: validateComparator }),
    // the values to use as the threshold; `between` and `notBetween` require
    // two values, the others require one.
    threshold: schema.arrayOf(schema.number(), { minSize: 1, maxSize: 2 }),
    searchSourceFields: schema.object({}, { unknowns: 'allow' }),
  },
  {
    validate: validateParams,
  }
);

const betweenComparators = new Set(['between', 'notBetween']);

// using direct type not allowed, circular reference, so body is typed to any
function validateParams(anyParams: unknown): string | undefined {
  const { thresholdComparator, threshold }: Params = anyParams as Params;

  if (betweenComparators.has(thresholdComparator) && threshold.length === 1) {
    return i18n.translate('xpack.stackAlerts.indexThreshold.invalidThreshold2ErrorMessage', {
      defaultMessage:
        '[threshold]: must have two elements for the "{thresholdComparator}" comparator',
      values: {
        thresholdComparator,
      },
    });
  }
}

export function validateComparator(comparator: string): string | undefined {
  if (ComparatorFnNames.has(comparator)) return;

  return i18n.translate('xpack.stackAlerts.indexThreshold.invalidComparatorErrorMessage', {
    defaultMessage: 'invalid thresholdComparator specified: {comparator}',
    values: {
      comparator,
    },
  });
}
