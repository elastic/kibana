/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import * as rt from 'io-ts';
import { commonSearchSuccessResponseFieldsRT } from '../../utils/elasticsearch_runtime_types';

export const LOG_DOCUMENT_COUNT_ALERT_TYPE_ID = 'logs.alert.document.count';

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

export enum AlertStates {
  OK,
  ALERT,
  NO_DATA,
  ERROR,
}

const DocumentCountRT = rt.type({
  comparator: ComparatorRT,
  value: rt.number,
});

export type DocumentCount = rt.TypeOf<typeof DocumentCountRT>;

const CriterionRT = rt.type({
  field: rt.string,
  comparator: ComparatorRT,
  value: rt.union([rt.string, rt.number]),
});

export type Criterion = rt.TypeOf<typeof CriterionRT>;

const TimeUnitRT = rt.union([rt.literal('s'), rt.literal('m'), rt.literal('h'), rt.literal('d')]);
export type TimeUnit = rt.TypeOf<typeof TimeUnitRT>;

export const LogDocumentCountAlertParamsRT = rt.intersection([
  rt.type({
    count: DocumentCountRT,
    criteria: rt.array(CriterionRT),
    timeUnit: TimeUnitRT,
    timeSize: rt.number,
  }),
  rt.partial({
    groupBy: rt.array(rt.string),
  }),
]);

export type LogDocumentCountAlertParams = rt.TypeOf<typeof LogDocumentCountAlertParamsRT>;

export const UngroupedSearchQueryResponseRT = rt.intersection([
  commonSearchSuccessResponseFieldsRT,
  rt.type({
    hits: rt.type({
      total: rt.type({
        value: rt.number,
      }),
    }),
  }),
]);

export type UngroupedSearchQueryResponse = rt.TypeOf<typeof UngroupedSearchQueryResponseRT>;

export const GroupedSearchQueryResponseRT = rt.intersection([
  commonSearchSuccessResponseFieldsRT,
  rt.type({
    aggregations: rt.type({
      groups: rt.intersection([
        rt.type({
          buckets: rt.array(
            rt.type({
              key: rt.record(rt.string, rt.string),
              doc_count: rt.number,
              filtered_results: rt.type({
                doc_count: rt.number,
              }),
            })
          ),
        }),
        rt.partial({
          after_key: rt.record(rt.string, rt.string),
        }),
      ]),
    }),
    hits: rt.type({
      total: rt.type({
        value: rt.number,
      }),
    }),
  }),
]);

export type GroupedSearchQueryResponse = rt.TypeOf<typeof GroupedSearchQueryResponseRT>;
