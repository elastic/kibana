/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EsClient } from '@kbn/scout-oblt';
import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { timerange } from '@kbn/synthtrace-client';
import {
  APM_METRICS_DASHBOARD_SERVICES,
  APM_METRICS_NON_DASHBOARD_SERVICES,
  APM_METRICS_SERVICE_NAMES,
  createMetricsServiceInstance,
  generateAppMetrics,
} from '@kbn/synthtrace/src/scenarios/helpers/apm_metrics_dashboards';
import { METRICS_ENVIRONMENT } from '../constants';

const METRIC_SERVICES = [
  ...APM_METRICS_DASHBOARD_SERVICES,
  ...APM_METRICS_NON_DASHBOARD_SERVICES.filter((s) => s.runtimeName === 'jruby'),
];

export function metricsServices({
  from,
  to,
}: {
  from: number;
  to: number;
}): SynthtraceGenerator<ApmFields> {
  const range = timerange(from, to);

  const instances = METRIC_SERVICES.map((config) =>
    createMetricsServiceInstance(config, METRICS_ENVIRONMENT)
  );

  return range
    .interval('30s')
    .rate(1)
    .generator((timestamp) =>
      instances.flatMap(({ instance, config }) => [
        instance
          .transaction({ transactionName: 'GET /api/metrics' })
          .timestamp(timestamp)
          .duration(200)
          .success(),
        ...generateAppMetrics(instance, config, timestamp),
      ])
    );
}

const OTEL_NATIVE_JAVA_TEMPLATE_NAME = 'metrics-otel_native_java-scout';

interface OtelNativeJavaServiceConfig {
  serviceName: string;
  agentName: string;
  indexName: string;
  extraMetrics: Record<string, unknown>;
}

const OTEL_NATIVE_JAVA_SERVICES: OtelNativeJavaServiceConfig[] = [
  {
    serviceName: APM_METRICS_SERVICE_NAMES.OTEL_NATIVE_EDOT_JAVA,
    agentName: 'opentelemetry/java/elastic',
    indexName: `metrics-otel_native.${APM_METRICS_SERVICE_NAMES.OTEL_NATIVE_EDOT_JAVA}.otel-default`,
    extraMetrics: {
      'jvm.system.cpu.utilization': 0.5,
      'jvm.memory.used_after_last_gc': 250_000_000,
      'jvm.class.count': 8500,
      'jvm.gc.action': 'end of major GC',
      'jvm.gc.name': 'G1 Old Generation',
      'attributes.jvm.gc.action': 'end of major GC',
      'attributes.jvm.gc.name': 'G1 Old Generation',
    },
  },
  {
    serviceName: APM_METRICS_SERVICE_NAMES.OTEL_NATIVE_OTEL_JAVA,
    agentName: 'opentelemetry/java',
    indexName: `metrics-otel_native.${APM_METRICS_SERVICE_NAMES.OTEL_NATIVE_OTEL_JAVA}.otel-default`,
    extraMetrics: {
      'jvm.memory.used_after_last_gc': 250_000_000,
      'jvm.class.count': 8500,
    },
  },
];

function generateOtelNativeJavaDocs(
  config: OtelNativeJavaServiceConfig,
  startMs: number,
  endMs: number
): Array<{ index: string; doc: Record<string, unknown> }> {
  const docs: Array<{ index: string; doc: Record<string, unknown> }> = [];
  const intervalMs = 30_000;

  for (let ts = startMs; ts <= endMs; ts += intervalMs) {
    const timestamp = new Date(ts).toISOString();

    const baseFields = {
      '@timestamp': timestamp,
      'processor.event': 'metric',
      'metricset.name': 'app',
      'service.name': config.serviceName,
      'service.environment': METRICS_ENVIRONMENT,
      'service.node.name': `${config.serviceName}-instance`,
      'service.instance.id': `${config.serviceName}-instance`,
      'host.name': `${config.serviceName}-host`,
      'agent.name': config.agentName,
      'telemetry.sdk.name': 'opentelemetry',
      'telemetry.sdk.language': 'java',
    };

    docs.push({
      index: config.indexName,
      doc: {
        ...baseFields,
        'jvm.cpu.recent_utilization': 0.3,
        'jvm.memory.used': 300_000_000,
        'jvm.memory.limit': 512_000_000,
        'jvm.memory.committed': 400_000_000,
        'jvm.memory.type': 'heap',
        'jvm.memory.pool.name': 'G1 Old Gen',
        'jvm.thread.count': 42,
        'jvm.thread.state': 'runnable',
        'jvm.thread.daemon': true,
        ...config.extraMetrics,
      },
    });

    docs.push({
      index: config.indexName,
      doc: {
        ...baseFields,
        'jvm.cpu.recent_utilization': 0.3,
        'jvm.memory.used': 100_000_000,
        'jvm.memory.limit': 256_000_000,
        'jvm.memory.committed': 120_000_000,
        'jvm.memory.type': 'non_heap',
        'jvm.memory.pool.name': 'Metaspace',
        'jvm.thread.count': 42,
        ...config.extraMetrics,
      },
    });
  }

  return docs;
}

export async function setupOtelNativeJavaMetrics(
  esClient: EsClient,
  startMs: number,
  endMs: number
): Promise<void> {
  const indexPatterns = OTEL_NATIVE_JAVA_SERVICES.map((s) =>
    s.indexName.replace(/-default$/, '-*')
  );

  await esClient.indices.putIndexTemplate({
    name: OTEL_NATIVE_JAVA_TEMPLATE_NAME,
    index_patterns: indexPatterns,
    data_stream: {},
    priority: 500,
    template: {
      settings: { 'index.mapping.total_fields.limit': 2000 },
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          'service.name': { type: 'keyword' },
          'service.environment': { type: 'keyword' },
          'service.node.name': { type: 'keyword' },
          'service.instance.id': { type: 'keyword' },
          'host.name': { type: 'keyword' },
          'agent.name': { type: 'keyword' },
          'telemetry.sdk.name': { type: 'keyword' },
          'telemetry.sdk.language': { type: 'keyword' },
          'processor.event': { type: 'keyword' },
          'metricset.name': { type: 'keyword' },
          'jvm.memory.type': { type: 'keyword' },
          'jvm.memory.pool.name': { type: 'keyword' },
          'jvm.thread.daemon': { type: 'boolean' },
          'jvm.thread.state': { type: 'keyword' },
          'jvm.gc.action': { type: 'keyword' },
          'jvm.gc.name': { type: 'keyword' },
          'attributes.jvm.gc.action': { type: 'keyword' },
          'attributes.jvm.gc.name': { type: 'keyword' },
          'jvm.cpu.recent_utilization': { type: 'double' },
          'jvm.system.cpu.utilization': { type: 'double' },
          'jvm.memory.used': { type: 'long' },
          'jvm.memory.limit': { type: 'long' },
          'jvm.memory.committed': { type: 'long' },
          'jvm.memory.used_after_last_gc': { type: 'long' },
          'jvm.thread.count': { type: 'integer' },
          'jvm.class.count': { type: 'integer' },
        },
      },
    },
  });

  const allDocs = OTEL_NATIVE_JAVA_SERVICES.flatMap((config) =>
    generateOtelNativeJavaDocs(config, startMs, endMs)
  );

  const body = allDocs.flatMap(({ index, doc }) => [{ create: { _index: index } }, doc]);
  await esClient.bulk({ body, refresh: 'wait_for' });
}
