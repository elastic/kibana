/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriticalityLevel } from '../asset_criticality/types';
import type { RiskCategories } from './risk_weights/types';

export enum RiskScoreEntity {
  host = 'host',
  user = 'user',
}

export enum RiskEngineStatus {
  NOT_INSTALLED = 'NOT_INSTALLED',
  DISABLED = 'DISABLED',
  ENABLED = 'ENABLED',
}

export interface InitRiskEngineResult {
  legacyRiskEngineDisabled: boolean;
  riskEngineResourcesInstalled: boolean;
  riskEngineConfigurationCreated: boolean;
  riskEngineEnabled: boolean;
  errors: string[];
}

export interface SimpleRiskInput {
  id: string;
  index: string;
  category: RiskCategories;
  description: string;
  risk_score: string | number | undefined;
  timestamp: string | undefined;
  contribution_score?: number;
}

export interface EcsRiskScore {
  '@timestamp': string;
  host?: {
    name: string;
    risk: Omit<RiskScore, '@timestamp'>;
  };
  user?: {
    name: string;
    risk: Omit<RiskScore, '@timestamp'>;
  };
}

export type RiskInputs = SimpleRiskInput[];

/**
 * The API response object representing a risk score
 */
export interface RiskScore {
  '@timestamp': string;
  id_field: string;
  id_value: string;
  criticality_level?: CriticalityLevel;
  criticality_modifier?: number | undefined;
  calculated_level: RiskLevels;
  calculated_score: number;
  calculated_score_norm: number;
  category_1_score: number;
  category_1_count: number;
  category_2_score?: number;
  category_2_count?: number;
  notes: string[];
  inputs: RiskInputs;
}

export enum RiskLevels {
  unknown = 'Unknown',
  low = 'Low',
  moderate = 'Moderate',
  high = 'High',
  critical = 'Critical',
}
