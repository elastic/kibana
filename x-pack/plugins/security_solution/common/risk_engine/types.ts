/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
}

export interface EcsRiskScore {
  '@timestamp': string;
  host?: {
    risk: Omit<RiskScore, '@timestamp'>;
  };
  user?: {
    risk: Omit<RiskScore, '@timestamp'>;
  };
}

export type RiskInputs = SimpleRiskInput[];

export interface RiskScore {
  '@timestamp': string;
  id_field: string;
  id_value: string;
  calculated_level: string;
  calculated_score: number;
  calculated_score_norm: number;
  category_1_score: number;
  category_1_count: number;
  notes: string[];
  inputs: RiskInputs;
}
