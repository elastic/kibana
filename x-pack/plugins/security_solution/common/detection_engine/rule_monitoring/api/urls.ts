/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_DETECTION_ENGINE_URL as INTERNAL_URL } from '../../../constants';

export const GET_RULE_EXECUTION_EVENTS_URL =
  `${INTERNAL_URL}/rules/{ruleId}/execution/events` as const;
export const getRuleExecutionEventsUrl = (ruleId: string) =>
  `${INTERNAL_URL}/rules/${ruleId}/execution/events` as const;

export const GET_RULE_EXECUTION_RESULTS_URL =
  `${INTERNAL_URL}/rules/{ruleId}/execution/results` as const;
export const getRuleExecutionResultsUrl = (ruleId: string) =>
  `${INTERNAL_URL}/rules/${ruleId}/execution/results` as const;
