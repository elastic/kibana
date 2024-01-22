/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_PRODUCER, AlertConsumers, DefaultAlertFieldName } from '@kbn/rule-data-utils';
import { FILTERS, PhraseFilter } from '@kbn/es-query';

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
    query: {
      match_phrase: {
        [field]: value,
      },
    },
  } as PhraseFilter);

/**
 * Creates a match_phrase filter targeted to filtering alerts by producer
 */
export const createRuleProducerFilter = (producer: AlertConsumers) =>
  createMatchPhraseFilter(ALERT_RULE_PRODUCER, producer);
