/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { securityConfig } from './security';
import { observabilityConfig } from './observability';
import { searchConfig } from './search';
import type { GuideConfig, UseCase } from '../types';

type GuidesConfig = {
  [key in UseCase]: GuideConfig;
};

export const guidesConfig: GuidesConfig = {
  security: securityConfig,
  observability: observabilityConfig,
  search: searchConfig,
};
