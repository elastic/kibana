/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import {
  CoreSetup,
  Plugin,
  PluginInitializerContext,
  Logger,
  ServiceStatus,
} from '@kbn/core/server';
import { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import { metrics } from '@opentelemetry/api-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics-base';
import { Resource } from '@opentelemetry/resources';
import { diag, DiagLogger, DiagLogLevel } from '@opentelemetry/api';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import * as grpc from '@grpc/grpc-js';
import { PrometheusExporter } from './lib/prometheus_exporter';
import { MonitoringCollectionConfig } from './config';
import { registerDynamicRoute, registerV1PrometheusRoute, PROMETHEUS_PATH } from './routes';
import { TYPE_ALLOWLIST } from './constants';

export interface MonitoringCollectionSetup {
  registerMetric: <T>(metric: Metric<T>) => void;
}

export type MetricResult<T> = T & JsonObject;

export interface Metric<T> {
  type: string;
  schema: MakeSchemaFrom<T>;
  fetch: () => Promise<MetricResult<T> | Array<MetricResult<T>>>;
}

export class MonitoringCollectionPlugin implements Plugin<MonitoringCollectionSetup, void, {}, {}> {
  private readonly initializerContext: PluginInitializerContext;
  private readonly logger: Logger;
  private readonly config: MonitoringCollectionConfig;
  private readonly otlpLogger: DiagLogger;

  private metrics: Record<string, Metric<any>> = {};

  private prometheusExporter?: PrometheusExporter;

  constructor(initializerContext: PluginInitializerContext<MonitoringCollectionConfig>) {
    this.initializerContext = initializerContext;
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get();

    this.otlpLogger = {
      debug: (message) => this.logger.debug(message),
      error: (message) => this.logger.error(message),
      info: (message) => this.logger.info(message),
      warn: (message) => this.logger.warn(message),
      verbose: (message) => this.logger.trace(message),
    };
  }

  async getMetric(type: string) {
    if (this.metrics.hasOwnProperty(type)) {
      return await this.metrics[type].fetch();
    }
    this.logger.warn(`Call to 'getMetric' failed because type '${type}' does not exist.`);
    return undefined;
  }

  setup(core: CoreSetup) {
    const router = core.http.createRouter();
    const kibanaIndex = core.savedObjects.getKibanaIndex();
    const server = core.http.getServerInfo();
    const uuid = this.initializerContext.env.instanceUuid;
    const kibanaVersion = this.initializerContext.env.packageInfo.version;

    this.configureOpentelemetryMetrics(server.name, uuid, kibanaVersion);

    let status: ServiceStatus<unknown>;
    core.status.overall$.subscribe((newStatus) => {
      status = newStatus;
    });

    if (this.prometheusExporter) {
      registerV1PrometheusRoute({ router, prometheusExporter: this.prometheusExporter });
    }

    registerDynamicRoute({
      router,
      config: {
        kibanaIndex,
        kibanaVersion,
        server,
        uuid,
      },
      getStatus: () => status,
      getMetric: async (type: string) => {
        return await this.getMetric(type);
      },
    });

    return {
      registerMetric: <T>(metric: Metric<T>) => {
        if (this.metrics.hasOwnProperty(metric.type)) {
          this.logger.warn(
            `Skipping registration of metric type '${metric.type}'. This type has already been registered.`
          );
          return;
        }
        if (!TYPE_ALLOWLIST.includes(metric.type)) {
          this.logger.warn(
            `Skipping registration of metric type '${metric.type}'. This type is not supported in the allowlist.`
          );
          return;
        }
        this.metrics[metric.type] = metric;
      },
    };
  }

  private configureOpentelemetryMetrics(
    serviceName?: string,
    serviceInstanceId?: string,
    serviceVersion?: string
  ) {
    const meterProvider = new MeterProvider({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: serviceInstanceId,
        [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
      }),
    });

    metrics.setGlobalMeterProvider(meterProvider);

    const otlpConfig = this.config.opentelemetry?.metrics.otlp;
    const url =
      otlpConfig?.url ??
      process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ??
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    if (url) {
      // Add OTLP exporter
      // Set Authorization headers
      // OTLPMetricExporter internally will look at OTEL_EXPORTER_OTLP_METRICS_HEADERS env variable
      // if `headers` is not present in the kibana config file
      const metadata = new grpc.Metadata();
      if (otlpConfig.headers) {
        for (const [key, value] of Object.entries(otlpConfig.headers)) {
          metadata.add(key, value);
        }
      }

      const otlpLogLevel = otlpConfig.logLevel.toUpperCase() as keyof typeof DiagLogLevel;
      diag.setLogger(this.otlpLogger, DiagLogLevel[otlpLogLevel]);

      this.logger.debug(`Registering OpenTelemetry metrics exporter to ${url}`);
      meterProvider.addMetricReader(
        new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({ url, metadata }),
          exportIntervalMillis: otlpConfig.exportIntervalMillis,
        })
      );
    }

    if (this.config.opentelemetry?.metrics.prometheus.enabled) {
      // Add Prometheus exporter
      this.logger.debug(`Starting prometheus exporter at ${PROMETHEUS_PATH}`);
      this.prometheusExporter = new PrometheusExporter();
      meterProvider.addMetricReader(this.prometheusExporter);
    }
  }

  start() {}

  stop() {}
}
