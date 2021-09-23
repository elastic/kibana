/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_RULE_ALERT_ID_KEY } from '../../../../common/constants';

/**
 * @deprecated Once legacy notifications/"side car actions" goes away this should be removed
 */
export const legacyAddTags = (tags: string[], ruleAlertId: string): string[] =>
  Array.from(new Set([...tags, `${INTERNAL_RULE_ALERT_ID_KEY}:${ruleAlertId}`]));
