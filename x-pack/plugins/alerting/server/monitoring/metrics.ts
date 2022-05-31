/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Counter, Histogram, Meter } from '@opentelemetry/api-metrics';

export class Metrics {
  ruleExecutionsTotal: Counter;
  ruleExecutions: Counter;
  ruleFailures: Counter;
  ruleDuration: Histogram;

  constructor(meter: Meter) {
    this.ruleExecutionsTotal = meter.createCounter('ruleExecutionsTotal');
    this.ruleExecutions = meter.createCounter('ruleExecutions');
    this.ruleFailures = meter.createCounter('ruleFailures');
    this.ruleDuration = meter.createHistogram('ruleDuration');
  }
}
