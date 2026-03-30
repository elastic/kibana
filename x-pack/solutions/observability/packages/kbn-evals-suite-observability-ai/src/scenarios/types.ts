/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateRuleRequestBody } from '@kbn/alerting-plugin/common/routes/rule/apis/create';
import type { ErrorCountRuleParams } from '@kbn/response-ops-rule-params/error_count';

export interface GcsConfig {
  bucket: string;
  basePath: string;
}

export interface ErrorQuery {
  errorMessage: string;
  serviceName: string;
}

export type ApmErrorCountRuleCreateRequest = CreateRuleRequestBody<ErrorCountRuleParams>;

export interface AlertRuleConfig {
  ruleParams: ApmErrorCountRuleCreateRequest;
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

export interface ApmErrorIdSearchFields {
  'error.id'?: string[];
}

export interface AlertScenario extends BaseScenario {
  alertRule: AlertRuleConfig;
}
