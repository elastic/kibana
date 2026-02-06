/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicatorType } from '@kbn/slo-schema';

export const APM_SLO_INDICATOR_TYPES = [
  'sli.apm.transactionDuration',
  'sli.apm.transactionErrorRate',
] as const satisfies readonly IndicatorType[];

export type ApmIndicatorType = (typeof APM_SLO_INDICATOR_TYPES)[number];
