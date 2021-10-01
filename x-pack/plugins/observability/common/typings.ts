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
  'xpack.apm.sourcemapIndices': string;
  'xpack.apm.errorIndices': string;
  'xpack.apm.onboardingIndices': string;
  'xpack.apm.spanIndices': string;
  'xpack.apm.transactionIndices': string;
  'xpack.apm.metricsIndices': string;

  /* eslint-enable @typescript-eslint/naming-convention */
  apmAgentConfigurationIndex: string;
  apmCustomLinkIndex: string;
}
