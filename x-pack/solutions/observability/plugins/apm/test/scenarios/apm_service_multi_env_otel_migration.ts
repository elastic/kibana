/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Simulates a single service running in two environments that migrate from
 * classic Elastic APM to OTel at **different** points in time.
 *
 * Timeline (given a --from/--to range):
 *
 *   production  — 30% classic, 70% OTel  (migrates early at 30%)
 *   staging     — 70% classic, 30% OTel  (migrates late  at 70%)
 *
 *   production: |--- classic (30%) ---|---------- OTel (70%) ----------|
 *   staging:    |---------- classic (70%) ----------|--- OTel (30%) ---|
 *               from                                                   to
 *
 * Each environment has slightly different metric values so they are
 * distinguishable in the UI.
 *
 * Run:
 *   node scripts/synthtrace apm_service_multi_env_otel_migration --from now-1w --to now --clean
 *
 * Scenario options:
 * - serviceName (string, default: "multi-env-svc"): the shared service name
 * - rpm (number, default: 2): transactions per minute per phase
 */

import type { ApmOtelFields } from '@kbn/synthtrace-client';
import { apm, ApmSynthtracePipelineSchema, timerange } from '@kbn/synthtrace-client';
import type { Client } from '@elastic/elasticsearch';
import type { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import type { Scenario } from '@kbn/synthtrace';
import { withClient } from '@kbn/synthtrace';

const DEFAULT_SCENARIO_OPTS = {
  serviceName: 'multi-env-svc',
  rpm: 2,
};

function assertNoUnknownScenarioOpts(opts: Record<string, unknown>) {
  const unknown = Object.keys(opts).filter((k) => !(k in DEFAULT_SCENARIO_OPTS));
  if (unknown.length) {
    throw new Error(`Unknown scenarioOpts: ${unknown.join(', ')}`);
  }
}

const OTEL_INDEX = 'metrics-otel_multi_env.otel-default';
const OTEL_TEMPLATE_NAME = 'metrics-otel_multi_env.otel';

interface EnvConfig {
  name: string;
  migrationPct: number;
  envIndex: number;
}

const ENVIRONMENTS: EnvConfig[] = [
  { name: 'production', migrationPct: 0.3, envIndex: 0 },
  { name: 'staging', migrationPct: 0.7, envIndex: 1 },
];

function generateClassicApmDocs(
  serviceName: string,
  environment: string,
  startMs: number,
  endMs: number,
  rpm: number,
  envIndex: number
): Array<{ index: string; doc: Record<string, unknown> }> {
  const docs: Array<{ index: string; doc: Record<string, unknown> }> = [];
  const metricIntervalMs = 30_000;
  const txnIntervalMs = Math.round(60_000 / rpm);
  const offset = envIndex * 0.05;

  for (let ts = startMs; ts <= endMs; ts += metricIntervalMs) {
    const timestamp = new Date(ts).toISOString();

    docs.push({
      index: 'metrics-apm.internal-default',
      doc: {
        '@timestamp': timestamp,
        'processor.event': 'metric',
        'metricset.name': 'app',
        'service.name': serviceName,
        'service.environment': environment,
        'service.node.name': `${serviceName}-${environment}-classic-instance`,
        'host.name': `${serviceName}-${environment}-host`,
        'agent.name': 'java',
        'agent.version': '1.50.0',
        'service.runtime.name': 'Java',
        'service.runtime.version': '17.0.1',
        'system.process.cpu.total.norm.pct': 0.6 + offset + Math.random() * 0.2,
        'system.cpu.total.norm.pct': 0.4 + offset + Math.random() * 0.1,
        'system.memory.actual.free': 2_000_000_000 - envIndex * 200_000_000,
        'system.memory.total': 8_000_000_000,
        'jvm.memory.heap.used':
          300_000_000 + envIndex * 20_000_000 + Math.floor(Math.random() * 100_000_000),
        'jvm.memory.heap.max': 512_000_000,
        'jvm.memory.non_heap.used': 80_000_000 + envIndex * 5_000_000,
        'jvm.thread.count': 40 + envIndex * 5 + Math.floor(Math.random() * 10),
      },
    });
  }

  for (let ts = startMs; ts <= endMs; ts += txnIntervalMs) {
    const timestamp = new Date(ts).toISOString();

    docs.push({
      index: 'traces-apm-default',
      doc: {
        '@timestamp': timestamp,
        'processor.event': 'transaction',
        'transaction.name': 'GET /api/data',
        'transaction.type': 'request',
        'transaction.result': 'HTTP 2xx',
        'transaction.duration.us':
          200_000 + envIndex * 50_000 + Math.floor(Math.random() * 100_000),
        'event.outcome': 'success',
        'service.name': serviceName,
        'service.environment': environment,
        'service.node.name': `${serviceName}-${environment}-classic-instance`,
        'host.name': `${serviceName}-${environment}-host`,
        'agent.name': 'java',
        'agent.version': '1.50.0',
        'service.runtime.name': 'Java',
        'service.runtime.version': '17.0.1',
      },
    });
  }

  return docs;
}

function generateOtelJvmDocs(
  serviceName: string,
  environment: string,
  startMs: number,
  endMs: number,
  envIndex: number
): Array<{ index: string; doc: Record<string, unknown> }> {
  const docs: Array<{ index: string; doc: Record<string, unknown> }> = [];
  const intervalMs = 30_000;
  const offset = envIndex * 0.03;

  for (let ts = startMs; ts <= endMs; ts += intervalMs) {
    const timestamp = new Date(ts).toISOString();
    const baseFields = {
      '@timestamp': timestamp,
      'processor.event': 'metric',
      'metricset.name': 'app',
      'service.name': serviceName,
      'service.environment': environment,
      'service.node.name': `${serviceName}-${environment}-otel-instance`,
      'service.instance.id': `${serviceName}-${environment}-otel-instance`,
      'host.name': `${serviceName}-${environment}-host`,
      'agent.name': 'opentelemetry/java/elastic',
      'telemetry.sdk.name': 'opentelemetry',
      'telemetry.sdk.language': 'java',
    };

    docs.push({
      index: OTEL_INDEX,
      doc: {
        ...baseFields,
        'jvm.cpu.recent_utilization': 0.3 + offset + Math.random() * 0.15,
        'jvm.system.cpu.utilization': 0.25 + offset + Math.random() * 0.15,
        'jvm.memory.used':
          300_000_000 + envIndex * 20_000_000 + Math.floor(Math.random() * 100_000_000),
        'jvm.memory.limit': 512_000_000,
        'jvm.memory.committed': 400_000_000 + envIndex * 10_000_000,
        'jvm.memory.used_after_last_gc':
          200_000_000 + envIndex * 10_000_000 + Math.floor(Math.random() * 50_000_000),
        'jvm.memory.type': 'heap',
        'jvm.memory.pool.name': 'G1 Old Gen',
        'jvm.thread.count': 42 + envIndex * 5 + Math.floor(Math.random() * 10),
        'jvm.thread.state': 'runnable',
        'jvm.thread.daemon': true,
        'jvm.class.count': 8500 + envIndex * 200 + Math.floor(Math.random() * 500),
        'jvm.gc.duration': 0.05 + offset + Math.random() * 0.05,
        'jvm.gc.action': 'end of major GC',
        'jvm.gc.name': 'G1 Old Generation',
      },
    });

    docs.push({
      index: OTEL_INDEX,
      doc: {
        ...baseFields,
        'jvm.memory.used':
          100_000_000 + envIndex * 5_000_000 + Math.floor(Math.random() * 20_000_000),
        'jvm.memory.limit': 256_000_000,
        'jvm.memory.committed': 120_000_000 + envIndex * 5_000_000,
        'jvm.memory.type': 'non_heap',
        'jvm.memory.pool.name': 'Metaspace',
        'jvm.thread.count': 42 + envIndex * 5 + Math.floor(Math.random() * 10),
      },
    });
  }

  return docs;
}

async function ensureOtelTemplate(esClient: Client) {
  await esClient.indices.deleteIndexTemplate({ name: OTEL_TEMPLATE_NAME }).catch(() => {});

  await esClient.indices.putIndexTemplate({
    name: OTEL_TEMPLATE_NAME,
    index_patterns: ['metrics-otel_multi_env.otel-*'],
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
          'jvm.cpu.recent_utilization': { type: 'double' },
          'jvm.system.cpu.utilization': { type: 'double' },
          'jvm.memory.used': { type: 'long' },
          'jvm.memory.limit': { type: 'long' },
          'jvm.memory.committed': { type: 'long' },
          'jvm.memory.used_after_last_gc': { type: 'long' },
          'jvm.thread.count': { type: 'integer' },
          'jvm.class.count': { type: 'integer' },
          'jvm.gc.duration': { type: 'double' },
        },
      },
    },
  } as unknown as IndicesPutIndexTemplateRequest);
}

async function bulkIndexDocs(
  esClient: Client,
  docs: Array<{ index: string; doc: Record<string, unknown> }>
) {
  if (docs.length === 0) return;
  const batchSize = 2000;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    const body = batch.flatMap(({ index, doc }) => [{ create: { _index: index } }, doc]);
    await esClient.bulk({ body, refresh: false });
  }
}

const scenario: Scenario<ApmOtelFields> = async ({ from, to, logger, ...runOptions }) => {
  const scenarioOpts = (runOptions.scenarioOpts ?? {}) as Record<string, unknown>;
  assertNoUnknownScenarioOpts(scenarioOpts);
  const opts = { ...DEFAULT_SCENARIO_OPTS, ...scenarioOpts } as typeof DEFAULT_SCENARIO_OPTS;
  const { serviceName, rpm } = opts;

  const totalRange = to - from;
  const migrationPoints = ENVIRONMENTS.map((env) => ({
    ...env,
    midpoint: from + totalRange * env.migrationPct,
  }));

  return {
    bootstrap: async (_synthtraceClients, _kibanaClient, esClient) => {
      logger.info('Creating index template for OTel JVM metrics...');
      await ensureOtelTemplate(esClient);

      for (const { name, midpoint, envIndex } of migrationPoints) {
        logger.info(
          `[env=${name}] Migration at ${Math.round(
            ENVIRONMENTS[envIndex].migrationPct * 100
          )}% (${new Date(midpoint).toISOString()})`
        );

        logger.info(
          `[env=${name}] Indexing classic APM data for "${serviceName}" (before migration)...`
        );
        const classicDocs = generateClassicApmDocs(
          serviceName,
          name,
          from,
          midpoint,
          rpm,
          envIndex
        );
        await bulkIndexDocs(esClient, classicDocs);
        logger.info(`[env=${name}] Indexed ${classicDocs.length} classic APM docs`);

        logger.info(
          `[env=${name}] Indexing OTel JVM metrics for "${serviceName}" (after migration)...`
        );
        const otelDocs = generateOtelJvmDocs(serviceName, name, midpoint, to, envIndex);
        await bulkIndexDocs(esClient, otelDocs);
        logger.info(`[env=${name}] Indexed ${otelDocs.length} OTel JVM metric docs`);
      }

      await esClient.indices.refresh({
        index: `metrics-apm.internal-default,${OTEL_INDEX}`,
      });
    },

    generate: ({ range, clients: { apmEsClient } }) => {
      const generators = [];
      for (const { name, midpoint, envIndex } of migrationPoints) {
        const otelInstance = apm
          .otelService({
            name: serviceName,
            namespace: name,
            sdkLanguage: 'java',
            sdkName: 'opentelemetry',
            distro: 'elastic',
          })
          .instance(`${serviceName}-${name}-otel-instance`);

        const rangeFromMs = range.from.getTime();
        const otelStart = new Date(Math.max(rangeFromMs, midpoint));

        if (otelStart >= range.to) {
          continue;
        }

        const otelRange = timerange(otelStart, range.to);
        const otelTraces = otelRange.ratePerMinute(rpm).generator((timestamp) =>
          otelInstance
            .span({ name: 'GET /api/data', kind: 'Server' })
            .timestamp(timestamp)
            .duration(200 + envIndex * 50)
            .success()
        );

        generators.push(withClient(apmEsClient, otelTraces));
      }
      return generators;
    },

    setupPipeline: ({ apmEsClient }) => {
      apmEsClient.setPipeline(apmEsClient.resolvePipelineType(ApmSynthtracePipelineSchema.Otel));
    },
  };
};

export default scenario;
