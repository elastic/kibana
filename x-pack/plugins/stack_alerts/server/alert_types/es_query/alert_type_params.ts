/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';
import { validateTimeWindowUnits } from '@kbn/triggers-actions-ui-plugin/server';
import { RuleTypeState } from '@kbn/alerting-plugin/server';
import { Comparator } from '../../../common/comparator_types';
import { ComparatorFnNames } from '../lib';
import { getComparatorSchemaType } from '../lib/comparator';

export const ES_QUERY_MAX_HITS_PER_EXECUTION = 10000;

// alert type parameters
export type EsQueryAlertParams = TypeOf<typeof EsQueryAlertParamsSchema>;
export interface EsQueryAlertState extends RuleTypeState {
  latestTimestamp: string | undefined;
}

const EsQueryAlertParamsSchemaProperties = {
  size: schema.number({ min: 0, max: ES_QUERY_MAX_HITS_PER_EXECUTION }),
  timeWindowSize: schema.number({ min: 1 }),
  timeWindowUnit: schema.string({ validate: validateTimeWindowUnits }),
  threshold: schema.arrayOf(schema.number(), { minSize: 1, maxSize: 2 }),
  thresholdComparator: getComparatorSchemaType(validateComparator),
  searchType: schema.nullable(schema.literal('searchSource')),
  // searchSource alert param only
  searchConfiguration: schema.conditional(
    schema.siblingRef('searchType'),
    schema.literal('searchSource'),
    schema.object({}, { unknowns: 'allow' }),
    schema.never()
  ),
  // esQuery alert params only
  esQuery: schema.conditional(
    schema.siblingRef('searchType'),
    schema.literal('searchSource'),
    schema.never(),
    schema.string({ minLength: 1 })
  ),
  index: schema.conditional(
    schema.siblingRef('searchType'),
    schema.literal('searchSource'),
    schema.never(),
    schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 })
  ),
  timeField: schema.conditional(
    schema.siblingRef('searchType'),
    schema.literal('searchSource'),
    schema.never(),
    schema.string({ minLength: 1 })
  ),
};

export const EsQueryAlertParamsSchema = schema.object(EsQueryAlertParamsSchemaProperties, {
  validate: validateParams,
});

const betweenComparators = new Set(['between', 'notBetween']);

// using direct type not allowed, circular reference, so body is typed to any
function validateParams(anyParams: unknown): string | undefined {
  const { esQuery, thresholdComparator, threshold, searchType } = anyParams as EsQueryAlertParams;

  if (betweenComparators.has(thresholdComparator) && threshold.length === 1) {
    return i18n.translate('xpack.stackAlerts.esQuery.invalidThreshold2ErrorMessage', {
      defaultMessage:
        '[threshold]: must have two elements for the "{thresholdComparator}" comparator',
      values: {
        thresholdComparator,
      },
    });
  }

  if (searchType === 'searchSource') {
    return;
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

function validateComparator(comparator: Comparator): string | undefined {
  if (ComparatorFnNames.has(comparator)) return;

  return i18n.translate('xpack.stackAlerts.esQuery.invalidComparatorErrorMessage', {
    defaultMessage: 'invalid thresholdComparator specified: {comparator}',
    values: {
      comparator,
    },
  });
}
