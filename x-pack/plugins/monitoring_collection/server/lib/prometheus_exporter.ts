/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Adapted from https://github.com/open-telemetry/opentelemetry-js/blob/aabc5f6b89e3d9af6640fb854967212ca5b1a3b8/experimental/packages/opentelemetry-exporter-prometheus/src/PrometheusExporter.ts

import { AggregationTemporality, MetricReader } from '@opentelemetry/sdk-metrics-base';
import { PrometheusExporter as OpenTelemetryPrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { ExporterConfig } from '@opentelemetry/exporter-prometheus';
import { KibanaResponseFactory } from '@kbn/core/server';
import { Logger } from '@kbn/core/server';
import { PrometheusSerializer } from './prometheus_serializer';

export class PrometheusExporter extends MetricReader {
  private readonly _prefix?: string;
  private readonly _appendTimestamp: boolean;
  private _serializer: PrometheusSerializer;

  constructor(logger: Logger, config: ExporterConfig = {}) {
    super();
    this._prefix = config.prefix || OpenTelemetryPrometheusExporter.DEFAULT_OPTIONS.prefix;
    this._appendTimestamp =
      typeof config.appendTimestamp === 'boolean'
        ? config.appendTimestamp
        : OpenTelemetryPrometheusExporter.DEFAULT_OPTIONS.appendTimestamp;

    this._serializer = new PrometheusSerializer(logger, this._prefix, this._appendTimestamp);
  }

  selectAggregationTemporality(): AggregationTemporality {
    return AggregationTemporality.CUMULATIVE;
  }

  protected onForceFlush(): Promise<void> {
    return Promise.resolve(undefined);
  }

  protected onShutdown(): Promise<void> {
    return Promise.resolve(undefined);
  }

  /**
   * Responds to incoming message with current state of all metrics.
   */
  public exportMetrics(res: KibanaResponseFactory) {
    // TODO: How can I type this return without requiring (forbidden path) KibanaReponse?
    return this.collect().then(
      (collectionResult) => {
        const { resourceMetrics, errors } = collectionResult;
        if (errors.length) {
          return res.customError({
            statusCode: 500,
            body: `PrometheusExporter: metrics collection errors ${errors}`,
          });
        }
        const result = this._serializer.serialize(resourceMetrics);
        if (result === '') {
          return res.noContent();
        }
        return res.ok({
          body: result,
        });
      },
      (err) => {
        return res.customError({
          statusCode: 500,
          body: `# Failed to export metrics ${err}`,
        });
      }
    );
  }
}
