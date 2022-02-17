/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import * as rt from 'io-ts';
import { commonSearchSuccessResponseFieldsRT } from '../../../utils/elasticsearch_runtime_types';

export const LOG_DOCUMENT_COUNT_RULE_TYPE_ID = 'logs.alert.document.count';

const ThresholdTypeRT = rt.keyof({
  count: null,
  ratio: null,
});

export type ThresholdType = rt.TypeOf<typeof ThresholdTypeRT>;

// Comparators //
export enum Comparator {
  GT = 'more than',
  GT_OR_EQ = 'more than or equals',
  LT = 'less than',
  LT_OR_EQ = 'less than or equals',
  EQ = 'equals',
  NOT_EQ = 'does not equal',
  MATCH = 'matches',
  NOT_MATCH = 'does not match',
  MATCH_PHRASE = 'matches phrase',
  NOT_MATCH_PHRASE = 'does not match phrase',
}

const ComparatorRT = rt.keyof({
  [Comparator.GT]: null,
  [Comparator.GT_OR_EQ]: null,
  [Comparator.LT]: null,
  [Comparator.LT_OR_EQ]: null,
  [Comparator.EQ]: null,
  [Comparator.NOT_EQ]: null,
  [Comparator.MATCH]: null,
  [Comparator.NOT_MATCH]: null,
  [Comparator.MATCH_PHRASE]: null,
  [Comparator.NOT_MATCH_PHRASE]: null,
});

// Maps our comparators to i18n strings, some comparators have more specific wording
// depending on the field type the comparator is being used with.
export const ComparatorToi18nMap = {
  [Comparator.GT]: i18n.translate('xpack.infra.logs.alerting.comparator.gt', {
    defaultMessage: 'more than',
  }),
  [Comparator.GT_OR_EQ]: i18n.translate('xpack.infra.logs.alerting.comparator.gtOrEq', {
    defaultMessage: 'more than or equals',
  }),
  [Comparator.LT]: i18n.translate('xpack.infra.logs.alerting.comparator.lt', {
    defaultMessage: 'less than',
  }),
  [Comparator.LT_OR_EQ]: i18n.translate('xpack.infra.logs.alerting.comparator.ltOrEq', {
    defaultMessage: 'less than or equals',
  }),
  [Comparator.EQ]: i18n.translate('xpack.infra.logs.alerting.comparator.eq', {
    defaultMessage: 'is',
  }),
  [Comparator.NOT_EQ]: i18n.translate('xpack.infra.logs.alerting.comparator.notEq', {
    defaultMessage: 'is not',
  }),
  [`${Comparator.EQ}:number`]: i18n.translate('xpack.infra.logs.alerting.comparator.eqNumber', {
    defaultMessage: 'equals',
  }),
  [`${Comparator.NOT_EQ}:number`]: i18n.translate(
    'xpack.infra.logs.alerting.comparator.notEqNumber',
    {
      defaultMessage: 'does not equal',
    }
  ),
  [Comparator.MATCH]: i18n.translate('xpack.infra.logs.alerting.comparator.match', {
    defaultMessage: 'matches',
  }),
  [Comparator.NOT_MATCH]: i18n.translate('xpack.infra.logs.alerting.comparator.notMatch', {
    defaultMessage: 'does not match',
  }),
  [Comparator.MATCH_PHRASE]: i18n.translate('xpack.infra.logs.alerting.comparator.matchPhrase', {
    defaultMessage: 'matches phrase',
  }),
  [Comparator.NOT_MATCH_PHRASE]: i18n.translate(
    'xpack.infra.logs.alerting.comparator.notMatchPhrase',
    {
      defaultMessage: 'does not match phrase',
    }
  ),
};

export const ComparatorToi18nSymbolsMap = {
  [Comparator.GT]: '>',
  [Comparator.GT_OR_EQ]: '≥',
  [Comparator.LT]: '<',
  [Comparator.LT_OR_EQ]: '≤',
  [Comparator.EQ]: '=',
  [Comparator.NOT_EQ]: '≠',
  [`${Comparator.EQ}:number`]: '=',
  [`${Comparator.NOT_EQ}:number`]: '≠',

  // TODO: We could need to update the next messages to use symbols.
  [Comparator.MATCH]: i18n.translate('xpack.infra.logs.alerting.comparator.symbol.match', {
    defaultMessage: 'matches',
  }),
  [Comparator.NOT_MATCH]: i18n.translate('xpack.infra.logs.alerting.comparator.symbol.notMatch', {
    defaultMessage: 'does not match',
  }),
  [Comparator.MATCH_PHRASE]: i18n.translate(
    'xpack.infra.logs.alerting.comparator.symbol.matchPhrase',
    {
      defaultMessage: 'matches phrase',
    }
  ),
  [Comparator.NOT_MATCH_PHRASE]: i18n.translate(
    'xpack.infra.logs.alerting.comparator.symbol.notMatchPhrase',
    {
      defaultMessage: 'does not match phrase',
    }
  ),
};

// Alert parameters //
export enum AlertStates {
  OK,
  ALERT,
  NO_DATA,
  ERROR,
}

export const ThresholdRT = rt.type({
  comparator: ComparatorRT,
  value: rt.number,
});

export type Threshold = rt.TypeOf<typeof ThresholdRT>;

export const criterionRT = rt.type({
  field: rt.string,
  comparator: ComparatorRT,
  value: rt.union([rt.string, rt.number]),
});
export type Criterion = rt.TypeOf<typeof criterionRT>;

export const partialCriterionRT = rt.partial(criterionRT.props);
export type PartialCriterion = rt.TypeOf<typeof partialCriterionRT>;

export const countCriteriaRT = rt.array(criterionRT);
export type CountCriteria = rt.TypeOf<typeof countCriteriaRT>;

export const partialCountCriteriaRT = rt.array(partialCriterionRT);
export type PartialCountCriteria = rt.TypeOf<typeof partialCountCriteriaRT>;

export const ratioCriteriaRT = rt.tuple([countCriteriaRT, countCriteriaRT]);
export type RatioCriteria = rt.TypeOf<typeof ratioCriteriaRT>;

export const partialRatioCriteriaRT = rt.tuple([partialCountCriteriaRT, partialCountCriteriaRT]);
export type PartialRatioCriteria = rt.TypeOf<typeof partialRatioCriteriaRT>;

export const partialCriteriaRT = rt.union([partialCountCriteriaRT, partialRatioCriteriaRT]);
export type PartialCriteria = rt.TypeOf<typeof partialCriteriaRT>;

export const timeUnitRT = rt.union([
  rt.literal('s'),
  rt.literal('m'),
  rt.literal('h'),
  rt.literal('d'),
]);
export type TimeUnit = rt.TypeOf<typeof timeUnitRT>;

export const timeSizeRT = rt.number;
export const groupByRT = rt.array(rt.string);

const RequiredRuleParamsRT = rt.type({
  // NOTE: "count" would be better named as "threshold", but this would require a
  // migration of encrypted saved objects, so we'll keep "count" until it's problematic.
  count: ThresholdRT,
  timeUnit: timeUnitRT,
  timeSize: timeSizeRT,
});

const partialRequiredRuleParamsRT = rt.partial(RequiredRuleParamsRT.props);
export type PartialRequiredRuleParams = rt.TypeOf<typeof partialRequiredRuleParamsRT>;

const OptionalRuleParamsRT = rt.partial({
  groupBy: groupByRT,
});

export const countRuleParamsRT = rt.intersection([
  rt.type({
    criteria: countCriteriaRT,
    ...RequiredRuleParamsRT.props,
  }),
  rt.partial({
    ...OptionalRuleParamsRT.props,
  }),
]);
export type CountRuleParams = rt.TypeOf<typeof countRuleParamsRT>;

export const partialCountRuleParamsRT = rt.intersection([
  rt.type({
    criteria: partialCountCriteriaRT,
    ...RequiredRuleParamsRT.props,
  }),
  rt.partial({
    ...OptionalRuleParamsRT.props,
  }),
]);
export type PartialCountRuleParams = rt.TypeOf<typeof partialCountRuleParamsRT>;

export const ratioRuleParamsRT = rt.intersection([
  rt.type({
    criteria: ratioCriteriaRT,
    ...RequiredRuleParamsRT.props,
  }),
  rt.partial({
    ...OptionalRuleParamsRT.props,
  }),
]);
export type RatioRuleParams = rt.TypeOf<typeof ratioRuleParamsRT>;

export const partialRatioRuleParamsRT = rt.intersection([
  rt.type({
    criteria: partialRatioCriteriaRT,
    ...RequiredRuleParamsRT.props,
  }),
  rt.partial({
    ...OptionalRuleParamsRT.props,
  }),
]);
export type PartialRatioRuleParams = rt.TypeOf<typeof partialRatioRuleParamsRT>;

export const ruleParamsRT = rt.union([countRuleParamsRT, ratioRuleParamsRT]);
export type RuleParams = rt.TypeOf<typeof ruleParamsRT>;

export const partialRuleParamsRT = rt.union([partialCountRuleParamsRT, partialRatioRuleParamsRT]);
export type PartialRuleParams = rt.TypeOf<typeof partialRuleParamsRT>;

export const isRatioRule = (criteria: PartialCriteria): criteria is PartialRatioCriteria => {
  return criteria.length > 0 && Array.isArray(criteria[0]) ? true : false;
};

export const isRatioRuleParams = (params: RuleParams): params is RatioRuleParams => {
  return isRatioRule(params.criteria);
};

export const getNumerator = <C extends RatioCriteria | PartialRatioCriteria>(criteria: C): C[0] => {
  return criteria[0];
};

export const getDenominator = <C extends RatioCriteria | PartialRatioCriteria>(
  criteria: C
): C[1] => {
  return criteria[1];
};

export const hasGroupBy = (params: RuleParams) => {
  const { groupBy } = params;
  return groupBy && groupBy.length > 0 ? true : false;
};

// Chart previews //
const chartPreviewHistogramBucket = rt.type({
  key: rt.number,
  doc_count: rt.number,
});

const ChartPreviewBucketsRT = rt.partial({
  histogramBuckets: rt.type({
    buckets: rt.array(chartPreviewHistogramBucket),
  }),
});

// ES query responses //
const hitsRT = rt.type({
  total: rt.type({
    value: rt.number,
  }),
});

const bucketFieldsRT = rt.type({
  key: rt.record(rt.string, rt.string),
  doc_count: rt.number,
});

const afterKeyRT = rt.partial({
  after_key: rt.record(rt.string, rt.string),
});

export const UngroupedSearchQueryResponseRT = rt.intersection([
  commonSearchSuccessResponseFieldsRT,
  rt.intersection([
    rt.type({
      hits: hitsRT,
    }),
    rt.partial({
      aggregations: ChartPreviewBucketsRT,
    }),
  ]),
]);

export type UngroupedSearchQueryResponse = rt.TypeOf<typeof UngroupedSearchQueryResponseRT>;

export const UnoptimizedGroupedSearchQueryResponseRT = rt.intersection([
  commonSearchSuccessResponseFieldsRT,
  rt.type({
    aggregations: rt.type({
      groups: rt.intersection([
        rt.type({
          buckets: rt.array(
            rt.type({
              ...bucketFieldsRT.props,
              filtered_results: rt.intersection([
                rt.type({
                  doc_count: rt.number,
                }),
                ChartPreviewBucketsRT,
              ]),
            })
          ),
        }),
        afterKeyRT,
      ]),
    }),
    hits: hitsRT,
  }),
]);

export type UnoptimizedGroupedSearchQueryResponse = rt.TypeOf<
  typeof UnoptimizedGroupedSearchQueryResponseRT
>;

export const OptimizedGroupedSearchQueryResponseRT = rt.intersection([
  commonSearchSuccessResponseFieldsRT,
  rt.type({
    aggregations: rt.type({
      groups: rt.intersection([
        rt.type({
          buckets: rt.array(rt.intersection([bucketFieldsRT, ChartPreviewBucketsRT])),
        }),
        afterKeyRT,
      ]),
    }),
    hits: hitsRT,
  }),
]);

export type OptimizedGroupedSearchQueryResponse = rt.TypeOf<
  typeof OptimizedGroupedSearchQueryResponseRT
>;

export const GroupedSearchQueryResponseRT = rt.union([
  UnoptimizedGroupedSearchQueryResponseRT,
  OptimizedGroupedSearchQueryResponseRT,
]);

export type GroupedSearchQueryResponse = rt.TypeOf<typeof GroupedSearchQueryResponseRT>;

export const isOptimizedGroupedSearchQueryResponse = (
  response: GroupedSearchQueryResponse['aggregations']['groups']['buckets']
): response is OptimizedGroupedSearchQueryResponse['aggregations']['groups']['buckets'] => {
  const result = response[0];
  return result && !result.hasOwnProperty('filtered_results');
};

export const isOptimizableGroupedThreshold = (
  selectedComparator: RuleParams['count']['comparator'],
  selectedValue?: RuleParams['count']['value']
) => {
  if (selectedComparator === Comparator.GT) {
    return true;
  } else if (
    typeof selectedValue === 'number' &&
    selectedComparator === Comparator.GT_OR_EQ &&
    selectedValue > 0
  ) {
    return true;
  } else {
    return false;
  }
};
