/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UnitsMap, unitsMap } from '@elastic/datemath';
import { schema } from '@kbn/config-schema';
import { METRIC_EXPLORER_AGGREGATIONS } from '../../../../common/http_api/metrics_explorer';
import { oneOfLiterals, validateIsStringElasticsearchJSONFilter } from '../common/utils';
import { Aggregators, AlertTypeParamsFromValidator, Comparator } from './types';

const baseCriterion = {
  threshold: schema.arrayOf(schema.number()),
  comparator: oneOfLiterals(Object.values(Comparator)),
  timeUnit: oneOfLiterals(Object.keys(unitsMap) as Array<keyof UnitsMap>),
  timeSize: schema.number(),
  warningThreshold: schema.maybe(schema.arrayOf(schema.number())),
  warningComparator: schema.maybe(oneOfLiterals(Object.values(Comparator))),
};

const nonCountCriterion = schema.object({
  ...baseCriterion,
  aggType: oneOfLiterals(
    METRIC_EXPLORER_AGGREGATIONS.filter(
      (aggType): aggType is Exclude<Aggregators, Aggregators.COUNT> => aggType !== Aggregators.COUNT
    )
  ),
  metric: schema.string(),
});

const countCriterion = schema.object({
  ...baseCriterion,
  aggType: schema.literal(Aggregators.COUNT),
  metric: schema.never(),
});

export const metricThresholdAlertParamsValidator = schema.object(
  {
    criteria: schema.arrayOf(schema.oneOf([countCriterion, nonCountCriterion])),
    groupBy: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
    filterQuery: schema.maybe(
      schema.string({
        validate: validateIsStringElasticsearchJSONFilter,
      })
    ),
    sourceId: schema.string(),
    alertOnNoData: schema.maybe(schema.boolean()),
  },
  { unknowns: 'allow' }
);

export type MetricThresholdAlertTypeParams = AlertTypeParamsFromValidator<
  typeof metricThresholdAlertParamsValidator
>;
