/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { uniq } from 'lodash';

export const extractIndexPatterns = (apmConfig: Record<string, string>): string[] =>
  uniq(
    [
      'sourcemapIndices',
      'errorIndices',
      'transactionIndices',
      'spanIndices',
      'metricsIndices',
      'onboardingIndices',
    ].map(type => apmConfig[type]!)
  );
