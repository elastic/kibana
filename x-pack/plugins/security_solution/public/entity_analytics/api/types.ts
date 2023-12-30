/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HostRiskScore, UserRiskScore } from '../../../common/search_strategy';

export interface HostRisk {
  loading: boolean;
  isModuleEnabled: boolean;
  result?: HostRiskScore[];
}

export interface UserRisk {
  loading: boolean;
  isModuleEnabled: boolean;
  result?: UserRiskScore[];
}
