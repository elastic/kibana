/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';

export enum RULE_PREVIEW_INVOCATION_COUNT {
  HOUR = 12,
  DAY = 24,
  WEEK = 168,
  MONTH = 30,
}

export enum RULE_PREVIEW_INTERVAL {
  HOUR = '5m',
  DAY = '1h',
  WEEK = '1h',
  MONTH = '1d',
}

export enum RULE_PREVIEW_FROM {
  HOUR = 'now-6m',
  DAY = 'now-65m',
  WEEK = 'now-65m',
  MONTH = 'now-25h',
}

export const PREBUILT_RULES_PACKAGE_NAME = 'security_detection_engine';

/**
 * Rule signature id (`rule.rule_id`) of the prebuilt "Endpoint Security" rule.
 */
export const ELASTIC_SECURITY_RULE_ID = '9a1a2dae-0b5f-4c3d-8305-a268d404c306';

export const DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY = 'suppress' as const;

export const MINIMUM_LICENSE_FOR_SUPPRESSION = 'platinum' as const;

export const SUPPRESSIBLE_ALERT_RULES: Type[] = [
  'threshold',
  'saved_query',
  'query',
  'threat_match',
];
