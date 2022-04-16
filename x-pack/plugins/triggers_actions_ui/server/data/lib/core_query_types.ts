/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// common properties on time_series_query and alert_type_params

import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';

import { MAX_GROUPS } from '..';

export const CoreQueryParamsSchemaProperties = {
  // name of the indices to search
  index: schema.oneOf([
    schema.string({ minLength: 1 }),
    schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
  ]),
  // field in index used for date/time
  timeField: schema.string({ minLength: 1 }),
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
  // size of time window for date range aggregations
  timeWindowSize: schema.number({ min: 1 }),
  // units of time window for date range aggregations
  timeWindowUnit: schema.string({ validate: validateTimeWindowUnits }),
};

const CoreQueryParamsSchema = schema.object(CoreQueryParamsSchemaProperties);
export type CoreQueryParams = TypeOf<typeof CoreQueryParamsSchema>;

// Meant to be used in a "subclass"'s schema body validator, so the
// anyParams object is assumed to have been validated with the schema
// above.
// Using direct type not allowed, circular reference, so body is typed to unknown.
export function validateCoreQueryBody(anyParams: unknown): string | undefined {
  const { aggType, aggField, groupBy, termField, termSize }: CoreQueryParams =
    anyParams as CoreQueryParams;
  if (aggType !== 'count' && !aggField) {
    return i18n.translate(
      'xpack.triggersActionsUI.data.coreQueryParams.aggTypeRequiredErrorMessage',
      {
        defaultMessage: '[aggField]: must have a value when [aggType] is "{aggType}"',
        values: {
          aggType,
        },
      }
    );
  }

  // check grouping
  if (groupBy === 'top') {
    if (termField == null) {
      return i18n.translate(
        'xpack.triggersActionsUI.data.coreQueryParams.termFieldRequiredErrorMessage',
        {
          defaultMessage: '[termField]: termField required when [groupBy] is top',
        }
      );
    }
    if (termSize == null) {
      return i18n.translate(
        'xpack.triggersActionsUI.data.coreQueryParams.termSizeRequiredErrorMessage',
        {
          defaultMessage: '[termSize]: termSize required when [groupBy] is top',
        }
      );
    }
    if (termSize > MAX_GROUPS) {
      return i18n.translate(
        'xpack.triggersActionsUI.data.coreQueryParams.invalidTermSizeMaximumErrorMessage',
        {
          defaultMessage: '[termSize]: must be less than or equal to {maxGroups}',
          values: {
            maxGroups: MAX_GROUPS,
          },
        }
      );
    }
  }
}

const AggTypes = new Set(['count', 'avg', 'min', 'max', 'sum']);

function validateAggType(aggType: string): string | undefined {
  if (AggTypes.has(aggType)) {
    return;
  }

  return i18n.translate('xpack.triggersActionsUI.data.coreQueryParams.invalidAggTypeErrorMessage', {
    defaultMessage: 'invalid aggType: "{aggType}"',
    values: {
      aggType,
    },
  });
}

export function validateGroupBy(groupBy: string): string | undefined {
  if (groupBy === 'all' || groupBy === 'top') {
    return;
  }

  return i18n.translate('xpack.triggersActionsUI.data.coreQueryParams.invalidGroupByErrorMessage', {
    defaultMessage: 'invalid groupBy: "{groupBy}"',
    values: {
      groupBy,
    },
  });
}

const TimeWindowUnits = new Set(['s', 'm', 'h', 'd']);

export function validateTimeWindowUnits(timeWindowUnit: string): string | undefined {
  if (TimeWindowUnits.has(timeWindowUnit)) {
    return;
  }

  return i18n.translate(
    'xpack.triggersActionsUI.data.coreQueryParams.invalidTimeWindowUnitsErrorMessage',
    {
      defaultMessage: 'invalid timeWindowUnit: "{timeWindowUnit}"',
      values: {
        timeWindowUnit,
      },
    }
  );
}
