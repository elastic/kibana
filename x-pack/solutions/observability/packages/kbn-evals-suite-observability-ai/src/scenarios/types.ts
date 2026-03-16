/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface GcsConfig {
  bucket: string;
  basePath: string;
}

export interface ErrorQuery {
  errorMessage: string;
  serviceName: string;
}

export interface AlertRuleConfig {
  ruleParams: Record<string, unknown>;
  alertsIndex: string;
}

export interface BaseScenario {
  id: string;
  description: string;
  snapshotName: string;
  gcs: GcsConfig;
  expectedOutput: string;
}

export interface ApmErrorScenario extends BaseScenario {
  errorQuery: ErrorQuery;
}

export interface AlertScenario extends BaseScenario {
  alertRule: AlertRuleConfig;
}
