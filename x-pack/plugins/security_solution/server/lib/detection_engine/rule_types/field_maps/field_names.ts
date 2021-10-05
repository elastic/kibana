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
export const ALERT_ORIGINAL_EVENT = `${ALERT_NAMESPACE}.original_event` as const;
export const ALERT_ORIGINAL_TIME = `${ALERT_NAMESPACE}.original_time` as const;

const ALERT_RULE_THRESHOLD = `${ALERT_RULE_NAMESPACE}.threshold` as const;
export const ALERT_RULE_THRESHOLD_FIELD = `${ALERT_RULE_THRESHOLD}.field` as const;
