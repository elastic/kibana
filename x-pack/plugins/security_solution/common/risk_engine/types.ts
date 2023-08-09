/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
