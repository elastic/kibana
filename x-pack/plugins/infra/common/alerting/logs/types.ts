/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

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

export interface DocumentCount {
  comparator: Comparator;
  value: number;
}

export interface Criterion {
  field: string;
  comparator: Comparator;
  value: string | number;
}

export interface LogDocumentCountAlertParams {
  count: DocumentCount;
  criteria: Criterion[];
  timeUnit: 's' | 'm' | 'h' | 'd';
  timeSize: number;
}

export type TimeUnit = 's' | 'm' | 'h' | 'd';
