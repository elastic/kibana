/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_NAMESPACE, ALERT_RULE_NAMESPACE } from '@kbn/rule-data-utils';

export const ALERT_ANCESTORS = `${ALERT_NAMESPACE}.ancestors` as const;
export const ALERT_BUILDING_BLOCK_TYPE = `${ALERT_NAMESPACE}.building_block_type` as const;
export const ALERT_DEPTH = `${ALERT_NAMESPACE}.depth` as const;
export const ALERT_GROUP_ID = `${ALERT_NAMESPACE}.group.id` as const;
export const ALERT_GROUP_INDEX = `${ALERT_NAMESPACE}.group.index` as const;
export const ALERT_ORIGINAL_TIME = `${ALERT_NAMESPACE}.original_time` as const;
export const ALERT_THRESHOLD_RESULT = `${ALERT_NAMESPACE}.threshold_result` as const;

export const ALERT_ORIGINAL_EVENT = `${ALERT_NAMESPACE}.original_event` as const;
export const ALERT_ORIGINAL_EVENT_ACTION = `${ALERT_ORIGINAL_EVENT}.action` as const;
export const ALERT_ORIGINAL_EVENT_CATEGORY = `${ALERT_ORIGINAL_EVENT}.category` as const;
export const ALERT_ORIGINAL_EVENT_DATASET = `${ALERT_ORIGINAL_EVENT}.dataset` as const;
export const ALERT_ORIGINAL_EVENT_KIND = `${ALERT_ORIGINAL_EVENT}.kind` as const;
export const ALERT_ORIGINAL_EVENT_MODULE = `${ALERT_ORIGINAL_EVENT}.module` as const;
export const ALERT_ORIGINAL_EVENT_TYPE = `${ALERT_ORIGINAL_EVENT}.type` as const;

export const ALERT_RULE_THRESHOLD = `${ALERT_RULE_NAMESPACE}.threshold` as const;
export const ALERT_RULE_THRESHOLD_FIELD = `${ALERT_RULE_THRESHOLD}.field` as const;
export const ALERT_RULE_TIMELINE_ID = `${ALERT_RULE_NAMESPACE}.timeline_id` as const;
