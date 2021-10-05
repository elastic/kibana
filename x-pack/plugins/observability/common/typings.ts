/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

export type Maybe<T> = T | null | undefined;

export const alertWorkflowStatusRt = t.keyof({
  open: null,
  acknowledged: null,
  closed: null,
});
export type AlertWorkflowStatus = t.TypeOf<typeof alertWorkflowStatusRt>;

export interface ApmIndicesConfig {
  /* eslint-disable @typescript-eslint/naming-convention */
  'apm_oss.sourcemapIndices': string;
  'apm_oss.errorIndices': string;
  'apm_oss.onboardingIndices': string;
  'apm_oss.spanIndices': string;
  'apm_oss.transactionIndices': string;
  'apm_oss.metricsIndices': string;
  /* eslint-enable @typescript-eslint/naming-convention */
  apmAgentConfigurationIndex: string;
  apmCustomLinkIndex: string;
}
