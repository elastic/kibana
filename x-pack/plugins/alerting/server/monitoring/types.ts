/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MetricResult } from '../../../monitoring_collection/server';

export interface RuleMetric extends MetricResult {
  name: string;
  id: string;
  lastExecutionDuration: number;
  averageDrift: number;
  averageDuration: number;
  totalExecutions: number;
  lastExecutionTimeout: number;
  lastErrorDate: string;
  lastErrorMessage: string;
  lastErrorReason: string;
}
