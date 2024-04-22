/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_RULE_PRODUCER,
  ALERT_RULE_TYPE_ID,
  AlertConsumers,
  DefaultAlertFieldName,
} from '@kbn/rule-data-utils';
import { FILTERS, FilterStateStore, PhraseFilter, PhrasesFilter } from '@kbn/es-query';

const $state = {
  store: FilterStateStore.APP_STATE,
};

export type AlertsFeatureIdsFilter = PhrasesFilter & {
  meta: Pick<PhrasesFilter, 'meta'> & { alertsFeatureIds: AlertConsumers[] };
};

/**
 * Creates a match_phrase filter without an index pattern
 */
export const createMatchPhraseFilter = (field: DefaultAlertFieldName, value: unknown) =>
  ({
    meta: {
      field,
      type: FILTERS.PHRASE,
      key: field,
      alias: null,
      disabled: false,
      index: undefined,
      negate: false,
      params: { query: value },
      value: undefined,
    },
    $state,
    query: {
      match_phrase: {
        [field]: value,
      },
    },
  } as PhraseFilter);

/**
 * Creates a match_phrases filter without an index pattern
 */
export const createMatchPhrasesFilter = (
  field: DefaultAlertFieldName,
  values: unknown[],
  alias: string | null = null
) =>
  ({
    meta: {
      field,
      type: FILTERS.PHRASES,
      key: field,
      alias,
      disabled: false,
      index: undefined,
      negate: false,
      params: values,
      value: undefined,
    },
    $state,
    query: {
      bool: {
        minimum_should_match: 1,
        should: values.map((v) => ({
          match_phrase: {
            [field]: v,
          },
        })),
      },
    },
  } as PhrasesFilter);

/**
 * Creates a match_phrase filter targeted to filtering alerts by producer
 */
export const createRuleProducerFilter = (producer: AlertConsumers) =>
  createMatchPhraseFilter(ALERT_RULE_PRODUCER, producer);

/**
 * Creates a match_phrase filter targeted to filtering alerts by rule type ids
 */
export const createRuleTypesFilter = (
  featureIds: AlertConsumers[],
  alias: string,
  ruleTypeIds: string[]
) => {
  const filter = createMatchPhrasesFilter(
    ALERT_RULE_TYPE_ID,
    ruleTypeIds,
    alias
  ) as AlertsFeatureIdsFilter;
  filter.meta.alertsFeatureIds = featureIds;
  return filter;
};
