/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';
import {
  validateTimeWindowUnits,
  validateAggType,
  validateGroupBy,
  MAX_GROUPS,
} from '@kbn/triggers-actions-ui-plugin/server';
import { RuleTypeState } from '@kbn/alerting-plugin/server';
import { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { ComparatorFnNames } from '../../../common';
import { Comparator } from '../../../common/comparator_types';
import { getComparatorSchemaType } from '../lib/comparator';

export const ES_QUERY_MAX_HITS_PER_EXECUTION = 10000;

// rule type parameters
export type EsQueryRuleParams = TypeOf<typeof EsQueryRuleParamsSchema>;
export interface EsQueryRuleState extends RuleTypeState {
  latestTimestamp: string | undefined;
}

export type EsQueryRuleParamsExtractedParams = Omit<EsQueryRuleParams, 'searchConfiguration'> & {
  searchConfiguration: SerializedSearchSourceFields & {
    indexRefName: string;
  };
};

const EsQueryRuleParamsSchemaProperties = {
  size: schema.number({ min: 0, max: ES_QUERY_MAX_HITS_PER_EXECUTION }),
  timeWindowSize: schema.number({ min: 1 }),
  excludeHitsFromPreviousRun: schema.boolean({ defaultValue: true }),
  timeWindowUnit: schema.string({ validate: validateTimeWindowUnits }),
  threshold: schema.arrayOf(schema.number(), { minSize: 1, maxSize: 2 }),
  thresholdComparator: getComparatorSchemaType(validateComparator),
  // aggregation type
  aggType: schema.string({ validate: validateAggType }),
  // aggregation field
  aggField: schema.maybe(schema.string({ minLength: 1 })),
  // how to group
  groupBy: schema.string({ validate: validateGroupBy }),
  // field to group on (for groupBy: top)
  termField: schema.maybe(schema.string({ minLength: 1 })),
  // limit on number of groups returned
  termSize: schema.maybe(schema.number({ min: 1 })),
  searchType: schema.oneOf([schema.literal('searchSource'), schema.literal('esQuery')], {
    defaultValue: 'esQuery',
  }),
  timeField: schema.conditional(
    schema.siblingRef('searchType'),
    schema.literal('esQuery'),
    schema.string({ minLength: 1 }),
    schema.maybe(schema.string({ minLength: 1 }))
  ),
  // searchSource rule param only
  searchConfiguration: schema.conditional(
    schema.siblingRef('searchType'),
    schema.literal('searchSource'),
    schema.object({}, { unknowns: 'allow' }),
    schema.never()
  ),
  // esQuery rule params only
  esQuery: schema.conditional(
    schema.siblingRef('searchType'),
    schema.literal('esQuery'),
    schema.string({ minLength: 1 }),
    schema.never()
  ),
  index: schema.conditional(
    schema.siblingRef('searchType'),
    schema.literal('esQuery'),
    schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
    schema.never()
  ),
};

export const EsQueryRuleParamsSchema = schema.object(EsQueryRuleParamsSchemaProperties, {
  validate: validateParams,
});

const betweenComparators = new Set(['between', 'notBetween']);

// using direct type not allowed, circular reference, so body is typed to any
function validateParams(anyParams: unknown): string | undefined {
  const {
    esQuery,
    thresholdComparator,
    threshold,
    searchType,
    aggType,
    aggField,
    groupBy,
    termField,
    termSize,
  } = anyParams as EsQueryRuleParams;

  if (betweenComparators.has(thresholdComparator) && threshold.length === 1) {
    return i18n.translate('xpack.stackAlerts.esQuery.invalidThreshold2ErrorMessage', {
      defaultMessage:
        '[threshold]: must have two elements for the "{thresholdComparator}" comparator',
      values: {
        thresholdComparator,
      },
    });
  }

  if (aggType !== 'count' && !aggField) {
    return i18n.translate('xpack.stackAlerts.esQuery.aggTypeRequiredErrorMessage', {
      defaultMessage: '[aggField]: must have a value when [aggType] is "{aggType}"',
      values: {
        aggType,
      },
    });
  }

  // check grouping
  if (groupBy === 'top') {
    if (termField == null) {
      return i18n.translate('xpack.stackAlerts.esQuery.termFieldRequiredErrorMessage', {
        defaultMessage: '[termField]: termField required when [groupBy] is top',
      });
    }
    if (termSize == null) {
      return i18n.translate('xpack.stackAlerts.esQuery.termSizeRequiredErrorMessage', {
        defaultMessage: '[termSize]: termSize required when [groupBy] is top',
      });
    }
    if (termSize > MAX_GROUPS) {
      return i18n.translate('xpack.stackAlerts.esQuery.invalidTermSizeMaximumErrorMessage', {
        defaultMessage: '[termSize]: must be less than or equal to {maxGroups}',
        values: {
          maxGroups: MAX_GROUPS,
        },
      });
    }
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
