/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RuleType } from '../detection_engine/types';

// Based on ML Job/Datafeed States from x-pack/legacy/plugins/ml/common/constants/states.js
const enabledStates = ['started', 'opened'];
const loadingStates = ['starting', 'stopping', 'opening', 'closing'];
const failureStates = ['deleted', 'failed'];

export const isJobStarted = (jobState: string, datafeedState: string): boolean => {
  return enabledStates.includes(jobState) && enabledStates.includes(datafeedState);
};

export const isJobLoading = (jobState: string, datafeedState: string): boolean => {
  return loadingStates.includes(jobState) || loadingStates.includes(datafeedState);
};

export const isJobFailed = (jobState: string, datafeedState: string): boolean => {
  return failureStates.includes(jobState) || failureStates.includes(datafeedState);
};

export const isMlRule = (ruleType: RuleType) => ruleType === 'machine_learning';
