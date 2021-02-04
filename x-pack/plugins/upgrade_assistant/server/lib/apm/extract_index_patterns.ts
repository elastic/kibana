/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq, pick } from 'lodash';
import { APMOSSConfig } from '../../../../../../src/plugins/apm_oss/server';

export const extractIndexPatterns = (apmConfig: APMOSSConfig): string[] => {
  const indexConfigs = pick(apmConfig, [
    'sourcemapIndices',
    'errorIndices',
    'transactionIndices',
    'spanIndices',
    'metricsIndices',
    'onboardingIndices',
  ]);

  return uniq(Object.values(indexConfigs));
};
