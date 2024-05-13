/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityRiskScore, RiskScoreInput } from '../../api/entity_analytics/common';

export enum RiskScoreEntity {
  host = 'host',
  user = 'user',
}

export interface InitRiskEngineResult {
  legacyRiskEngineDisabled: boolean;
  riskEngineResourcesInstalled: boolean;
  riskEngineConfigurationCreated: boolean;
  riskEngineEnabled: boolean;
  errors: string[];
}
export interface EcsRiskScore {
  '@timestamp': string;
  host?: {
    name: string;
    risk: Omit<EntityRiskScore, '@timestamp'>;
  };
  user?: {
    name: string;
    risk: Omit<EntityRiskScore, '@timestamp'>;
  };
}

export type RiskInputs = RiskScoreInput[];

export enum RiskLevels {
  unknown = 'Unknown',
  low = 'Low',
  moderate = 'Moderate',
  high = 'High',
  critical = 'Critical',
}
