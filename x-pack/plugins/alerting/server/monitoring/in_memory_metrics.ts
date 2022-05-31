/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { MeterProvider } from '@opentelemetry/sdk-metrics-base';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { Attributes, Counter } from '@opentelemetry/api-metrics';

export enum IN_MEMORY_METRICS {
  RULE_EXECUTIONS = 'ruleExecutions',
  RULE_FAILURES = 'ruleFailures',
  RULE_TIMEOUTS = 'ruleTimeouts',
}

export class InMemoryMetrics {
  private logger: Logger;
  private inMemoryMetrics: Record<IN_MEMORY_METRICS, number | null> = {
    [IN_MEMORY_METRICS.RULE_EXECUTIONS]: 0,
    [IN_MEMORY_METRICS.RULE_FAILURES]: 0,
    [IN_MEMORY_METRICS.RULE_TIMEOUTS]: 0,
  };

  private otelMetrics: {
    [IN_MEMORY_METRICS.RULE_EXECUTIONS]: Counter;
    [IN_MEMORY_METRICS.RULE_FAILURES]: Counter;
    [IN_MEMORY_METRICS.RULE_TIMEOUTS]: Counter;
  };

  constructor(logger: Logger) {
    this.logger = logger;

    this.logger.debug('MATSCHAFFER: CREATING meter provider');
    const provider = new MeterProvider({
      exporter: new OTLPMetricExporter(),
      interval: 1000,
    });
    const meter = provider.getMeter('example-meter');
    this.otelMetrics = {
      [IN_MEMORY_METRICS.RULE_EXECUTIONS]: meter.createCounter(IN_MEMORY_METRICS.RULE_EXECUTIONS),
      [IN_MEMORY_METRICS.RULE_FAILURES]: meter.createCounter(IN_MEMORY_METRICS.RULE_FAILURES),
      [IN_MEMORY_METRICS.RULE_TIMEOUTS]: meter.createCounter(IN_MEMORY_METRICS.RULE_TIMEOUTS),
    };
  }

  public increment(metric: IN_MEMORY_METRICS, attributes?: Attributes) {
    if (this.inMemoryMetrics[metric] === null) {
      this.logger.info(
        `Metric ${metric} is null because the counter ran over the max safe integer value, skipping increment.`
      );
      return;
    }

    if ((this.inMemoryMetrics[metric] as number) >= Number.MAX_SAFE_INTEGER) {
      this.inMemoryMetrics[metric] = null;
      this.logger.info(
        `Metric ${metric} has reached the max safe integer value and will no longer be used, skipping increment.`
      );
    } else {
      (this.inMemoryMetrics[metric] as number)++;
    }

    this.otelMetrics[metric].add(1, attributes);
  }

  public getInMemoryMetric(metric: IN_MEMORY_METRICS) {
    return this.inMemoryMetrics[metric];
  }

  public getAllInMemoryMetrics() {
    return this.inMemoryMetrics;
  }
}
