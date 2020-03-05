/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface ManualLoadingPolicy {
  policy: 'manual';
}

interface IntervalLoadingPolicy {
  policy: 'interval';
  delayMillis: number;
}

export type LoadingPolicy = ManualLoadingPolicy | IntervalLoadingPolicy;

export const isManualLoadingPolicy = (
  loadingPolicy: LoadingPolicy
): loadingPolicy is ManualLoadingPolicy => loadingPolicy.policy === 'manual';

export const isIntervalLoadingPolicy = (
  loadingPolicy: LoadingPolicy
): loadingPolicy is IntervalLoadingPolicy => loadingPolicy.policy === 'interval';
