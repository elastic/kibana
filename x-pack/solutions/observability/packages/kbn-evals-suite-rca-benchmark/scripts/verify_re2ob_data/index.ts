/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Pre-run data sanity check for the RE2-OB eval scenarios.
 *
 * For every scenario in RE2OB_SCENARIOS it:
 *   1. Resolves the local case dir under RCAEVAL_DATA_DIR.
 *   2. Indexes logs/traces/metrics with the real eval loader (indexLocalScenario).
 *   3. Verifies docs landed, the target service is present in each stream, and the
 *      fault-relevant metric field is populated for the target service.
 *   4. Cleans up.
 *
 * Usage:
 *   RCAEVAL_DATA_DIR=/home/beast/rcaeval-data \
 *   node --require @kbn/babel-register/install \
 *     x-pack/solutions/observability/packages/kbn-evals-suite-rca-benchmark/scripts/verify_re2ob_data/index.ts
 */

import { run } from '@kbn/dev-cli-runner';
import { Client } from '@elastic/elasticsearch';
import { RE2OB_SCENARIOS } from '../../src/scenarios/re2ob_scenarios';
import {
  resolveLocalCaseDir,
  indexLocalScenario,
  cleanLocalScenario,
} from '../../src/data_generators/local_replay';

// Fault type → metric field we expect to be populated for the target service.
// delay/loss are network faults that surface in latency/error + traces rather than
// a dedicated resource metric, so we only require trace/latency presence for those.
const FAULT_METRIC_FIELD: Record<string, string | null> = {
  cpu: 'system.cpu.pct',
  mem: 'system.memory.bytes',
  disk: 'system.diskio.bytes',
  socket: 'system.socket.count',
  delay: null,
  loss: null,
};

async function countDocs(es: Client, index: string, query: object): Promise<number> {
  const res = await es.count({ index, query, ignore_unavailable: true } as any);
  return res.count ?? 0;
}

async function distinctServices(es: Client, index: string): Promise<string[]> {
  const res = await es.search({
    index,
    size: 0,
    ignore_unavailable: true,
    aggs: { svc: { terms: { field: 'service.name', size: 50 } } },
  } as any);
  const buckets = (res.aggregations as any)?.svc?.buckets ?? [];
  return buckets.map((b: any) => b.key);
}

run(
  async ({ log }) => {
    const dataDir = process.env.RCAEVAL_DATA_DIR;
    if (!dataDir) throw new Error('RCAEVAL_DATA_DIR not set');

    const es = new Client({
      node: process.env.ES_URL || 'http://localhost:9200',
      auth: { username: 'elastic', password: 'changeme' },
    });

    const results: Array<{
      name: string;
      ok: boolean;
      logs: number;
      traces: number;
      metrics: number;
      svcInLogs: boolean;
      svcInTraces: boolean;
      svcInMetrics: boolean;
      faultMetricOk: boolean | null;
      notes: string[];
    }> = [];

    for (const scenario of RE2OB_SCENARIOS) {
      const notes: string[] = [];
      const caseDir = resolveLocalCaseDir(dataDir, scenario);
      if (!caseDir) {
        results.push({
          name: scenario.snapshotName,
          ok: false,
          logs: 0,
          traces: 0,
          metrics: 0,
          svcInLogs: false,
          svcInTraces: false,
          svcInMetrics: false,
          faultMetricOk: null,
          notes: ['NO CASE DIR RESOLVED'],
        });
        continue;
      }

      const handle = await indexLocalScenario(es, log, scenario, caseDir);
      try {
        await es.indices.refresh({
          index: `${handle.logsIndex},${handle.tracesIndex},${handle.metricsIndex}`,
          ignore_unavailable: true,
        } as any);

        const [logs, traces, metrics] = await Promise.all([
          countDocs(es, handle.logsIndex, { match_all: {} }),
          countDocs(es, handle.tracesIndex, { match_all: {} }),
          countDocs(es, handle.metricsIndex, { match_all: {} }),
        ]);

        const svc = scenario.service;
        const [logSvcs, traceSvcs, metricSvcs] = await Promise.all([
          distinctServices(es, handle.logsIndex),
          distinctServices(es, handle.tracesIndex),
          distinctServices(es, handle.metricsIndex),
        ]);

        const matchSvc = (list: string[]) =>
          list.some((s) => s === svc || s.includes(svc) || svc.includes(s));
        const svcInLogs = matchSvc(logSvcs);
        const svcInTraces = matchSvc(traceSvcs);
        const svcInMetrics = matchSvc(metricSvcs);

        // Fault metric check
        const field = FAULT_METRIC_FIELD[scenario.faultType];
        let faultMetricOk: boolean | null = null;
        if (field) {
          const c = await countDocs(es, handle.metricsIndex, {
            bool: {
              filter: [
                { term: { 'service.name': svc } },
                { exists: { field } },
              ],
            },
          });
          faultMetricOk = c > 0;
          if (!faultMetricOk) notes.push(`fault metric ${field} MISSING for ${svc}`);
        } else {
          notes.push(`network fault (${scenario.faultType}) — checking traces only`);
        }

        if (!svcInMetrics) notes.push(`${svc} not in metrics services: [${metricSvcs.join(', ')}]`);
        if (!svcInTraces) notes.push(`${svc} not in traces`);

        const ok =
          logs > 0 &&
          traces > 0 &&
          metrics > 0 &&
          svcInMetrics &&
          (faultMetricOk === null ? true : faultMetricOk) &&
          // for network faults, require the service to be visible in traces
          (field !== null || svcInTraces);

        results.push({
          name: scenario.snapshotName,
          ok,
          logs,
          traces,
          metrics,
          svcInLogs,
          svcInTraces,
          svcInMetrics,
          faultMetricOk,
          notes,
        });
      } finally {
        await cleanLocalScenario(es, handle, log);
      }
    }

    log.info('');
    log.info('================ RE2-OB DATA VERIFICATION ================');
    log.info(
      'scenario'.padEnd(34) +
        'OK  logs    traces  metrics  svc(L/T/M)  fault'
    );
    let pass = 0;
    for (const r of results) {
      const svcFlags = `${r.svcInLogs ? 'L' : '-'}${r.svcInTraces ? 'T' : '-'}${
        r.svcInMetrics ? 'M' : '-'
      }`;
      const fault = r.faultMetricOk === null ? 'n/a' : r.faultMetricOk ? 'yes' : 'NO';
      log.info(
        r.name.padEnd(34) +
          `${r.ok ? '✓ ' : '✗ '} ` +
          `${String(r.logs).padEnd(7)} ${String(r.traces).padEnd(7)} ${String(r.metrics).padEnd(
            8
          )} ${svcFlags.padEnd(11)} ${fault}`
      );
      if (r.notes.length) log.info('    ' + r.notes.join('; '));
      if (r.ok) pass++;
    }
    log.info('---------------------------------------------------------');
    log.info(`${pass}/${results.length} scenarios passed verification`);
    log.info('=========================================================');

    if (pass !== results.length) {
      throw new Error(`${results.length - pass} scenario(s) FAILED verification`);
    }
  },
  {
    description: 'Verify RE2-OB eval scenario data loads correctly into Elasticsearch',
  }
);
