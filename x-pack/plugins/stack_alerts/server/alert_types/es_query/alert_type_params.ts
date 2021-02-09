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
import { AlertTypeState } from '../../../../alerts/server';

export const ES_QUERY_MAX_HITS_PER_EXECUTION = 10000;

// alert type parameters
export type EsQueryAlertParams = TypeOf<typeof EsQueryAlertParamsSchema>;
export interface EsQueryAlertState extends AlertTypeState {
  latestTimestamp: string | undefined;
}

export const EsQueryAlertParamsSchemaProperties = {
  index: schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
  timeField: schema.string({ minLength: 1 }),
  esQuery: schema.string({ minLength: 1 }),
  size: schema.number({ min: 0, max: ES_QUERY_MAX_HITS_PER_EXECUTION }),
  timeWindowSize: schema.number({ min: 1 }),
  timeWindowUnit: schema.string({ validate: validateTimeWindowUnits }),
  threshold: schema.arrayOf(schema.number(), { minSize: 1, maxSize: 2 }),
  thresholdComparator: schema.string({ validate: validateComparator }),
};

export const EsQueryAlertParamsSchema = schema.object(EsQueryAlertParamsSchemaProperties, {
  validate: validateParams,
});

const betweenComparators = new Set(['between', 'notBetween']);

// using direct type not allowed, circular reference, so body is typed to any
function validateParams(anyParams: unknown): string | undefined {
  const {
    esQuery,
    thresholdComparator,
    threshold,
  }: EsQueryAlertParams = anyParams as EsQueryAlertParams;

  if (betweenComparators.has(thresholdComparator) && threshold.length === 1) {
    return i18n.translate('xpack.stackAlerts.esQuery.invalidThreshold2ErrorMessage', {
      defaultMessage:
        '[threshold]: must have two elements for the "{thresholdComparator}" comparator',
      values: {
        thresholdComparator,
      },
    });
  }

  try {
    const parsedQuery = JSON.parse(esQuery);

    if (parsedQuery && !parsedQuery.query) {
      return i18n.translate('xpack.stackAlerts.esQuery.missingEsQueryErrorMessage', {
        defaultMessage: '[esQuery]: must contain "query"',
      });
    }
  } catch (err) {
    return i18n.translate('xpack.stackAlerts.esQuery.invalidEsQueryErrorMessage', {
      defaultMessage: '[esQuery]: must be valid JSON',
    });
  }
}

export function validateComparator(comparator: string): string | undefined {
  if (ComparatorFnNames.has(comparator)) return;

  return i18n.translate('xpack.stackAlerts.esQuery.invalidComparatorErrorMessage', {
    defaultMessage: 'invalid thresholdComparator specified: {comparator}',
    values: {
      comparator,
    },
  });
}
