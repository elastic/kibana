/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_NAMESPACE } from '@kbn/rule-data-utils';

const ALERT_HITS_COUNT = `${ALERT_NAMESPACE}.hits.count` as const;
const ALERT_HITS_HITS = `${ALERT_NAMESPACE}.hits.hits` as const;
const ALERT_MESSAGE = `${ALERT_NAMESPACE}.message` as const;
const ALERT_TITLE = `${ALERT_NAMESPACE}.title` as const;
const ALERT_CONDITIONS = `${ALERT_NAMESPACE}.conditions` as const;
const ALERT_CONDITIONS_MET_VALUE = `${ALERT_NAMESPACE}.conditions_met_value` as const;
const ALERT_STATE_LAST_TIMESTAMP = `${ALERT_NAMESPACE}.state.latest_timestamp` as const;
const ALERT_STATE_DATE_START = `${ALERT_NAMESPACE}.state.date_start` as const;
const ALERT_STATE_DATE_END = `${ALERT_NAMESPACE}.state.date_end` as const;

export {
  ALERT_HITS_COUNT,
  ALERT_HITS_HITS,
  ALERT_MESSAGE,
  ALERT_TITLE,
  ALERT_CONDITIONS,
  ALERT_CONDITIONS_MET_VALUE,
  ALERT_STATE_LAST_TIMESTAMP,
  ALERT_STATE_DATE_START,
  ALERT_STATE_DATE_END,
};
