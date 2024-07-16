/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IntegrationLikeDetection, MisspeltFieldDetection } from './types';

export const createMisspeltFieldDetection = (
  params: Omit<MisspeltFieldDetection, 'type'>
): MisspeltFieldDetection => ({
  ...params,
  type: 'misspelt_field',
});

export const createIntegrationLikeDetection = (
  params: Omit<IntegrationLikeDetection, 'type'>
): IntegrationLikeDetection => ({
  ...params,
  type: 'integration_like',
});
