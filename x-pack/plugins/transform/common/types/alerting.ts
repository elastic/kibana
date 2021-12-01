/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Alert, AlertTypeParams } from '../../../alerting/common';

export type TransformHealthRuleParams = {
  includeTransforms?: string[];
  excludeTransforms?: string[] | null;
  testsConfig?: {
    notStarted?: {
      enabled: boolean;
    } | null;
  } | null;
} & AlertTypeParams;

export type TransformHealthRuleTestsConfig = TransformHealthRuleParams['testsConfig'];

export type TransformHealthTests = keyof Exclude<TransformHealthRuleTestsConfig, null | undefined>;

export type TransformHealthAlertRule = Omit<Alert<TransformHealthRuleParams>, 'apiKey'>;
