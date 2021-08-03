/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_NAMESPACE, ALERT_RULE_NAMESPACE } from '@kbn/rule-data-utils';

// Cast to `as const` to preserve the exact string value when using as a type rather than a value
export const ALERT_RULE_TACTIC = `${ALERT_RULE_NAMESPACE}.threat.tactic` as const;
export const ALERT_RULE_TACTIC_ID = `${ALERT_RULE_TACTIC}.id` as const;
export const ALERT_RULE_TACTIC_NAME = `${ALERT_RULE_TACTIC}.name` as const;
export const ALERT_RULE_TACTIC_REFERENCE = `${ALERT_RULE_TACTIC}.reference` as const;
