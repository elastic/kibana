/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { INTERNAL_RULE_ALERT_ID_KEY } from '../../../../common/constants';

export const addTags = (tags: string[], ruleAlertId: string): string[] =>
  Array.from(new Set([...tags, `${INTERNAL_RULE_ALERT_ID_KEY}:${ruleAlertId}`]));
