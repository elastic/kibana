/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { APM_METRICS_SERVICE_NAMES, APM_SYSTEM_METRICS, RUBY_JRUBY_METRICS } from '@kbn/synthtrace';
import { apiTest, testData } from '../../fixtures';

const COMMON_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
  Accept: 'application/json',
};

const buildQuery = (params: Record<string, string>): string =>
  new URLSearchParams(params).toString();

const COMMON_QUERY = {
  start: testData.START_DATE,
  end: testData.END_DATE,
  environment: testData.METRICS_ENVIRONMENT,
  kuery: '',
};

apiTest.describe(
  'APM Service Metrics API',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let cookieHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      cookieHeaders = { ...COMMON_HEADERS, ...cookieHeader };
    });

    apiTest('JRuby JVM nodes table values match the seeded metrics', async ({ apiClient }) => {
      const serviceName = APM_METRICS_SERVICE_NAMES.RUBY_JRUBY;
      const response = await apiClient.get(
        `internal/apm/services/${serviceName}/metrics/nodes?${buildQuery(COMMON_QUERY)}`,
        {
          headers: cookieHeaders,
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(200);
      const body = response.body as {
        serviceNodes: Array<{
          name: string;
          cpu: number | null;
          heapMemory: number | null;
          nonHeapMemory: number | null;
          threadCount: number | null;
        }>;
      };
      expect(body.serviceNodes).toHaveLength(1);

      const node = body.serviceNodes[0];
      expect(node.name).toBe(`${serviceName}-instance`);
      expect(node.threadCount).toBe(RUBY_JRUBY_METRICS['jvm.thread.count']);
      expect(node.heapMemory).toBe(RUBY_JRUBY_METRICS['jvm.memory.heap.used']);
      expect(node.nonHeapMemory).toBe(RUBY_JRUBY_METRICS['jvm.memory.non_heap.used']);
      // CPU is sourced from `system.process.cpu.total.norm.pct` (seeded via
      // `SYSTEM_METRICS`). The route averages it across the time range, so
      // for a constant seeded value the response must equal the seed.
      const expectedCpu = APM_SYSTEM_METRICS['system.process.cpu.total.norm.pct'] as number;
      expect(typeof node.cpu).toBe('number');
      expect(node.cpu as number).toBeCloseTo(expectedCpu, 5);
    });

    apiTest('JRuby charts endpoint exposes CPU + memory series', async ({ apiClient }) => {
      const serviceName = APM_METRICS_SERVICE_NAMES.RUBY_JRUBY;
      // The metrics tab calls this endpoint with `agentName: 'ruby'` for
      // both classic Ruby and JRuby services; the route uses agentName
      // (not runtimeName) to pick the chart set, so we mirror that.
      const response = await apiClient.get(
        `internal/apm/services/${serviceName}/metrics/charts?${buildQuery({
          ...COMMON_QUERY,
          agentName: 'ruby',
        })}`,
        {
          headers: cookieHeaders,
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(200);
      const body = response.body as { charts: Array<{ key: string; series: unknown[] }> };
      expect(body.charts.length).toBeGreaterThan(0);

      // Every returned chart key should expose at least one series so we
      // know the synth metrics flowed through the agent-specific transform.
      const allChartsHaveSeries = body.charts.every((chart) => chart.series.length > 0);
      expect(allChartsHaveSeries).toBe(true);

      const chartKeys = body.charts.map((chart) => chart.key);
      expect(chartKeys).toContain('cpu_usage_chart');
      expect(chartKeys).toContain('memory_usage_chart');
    });

    // The aws_lambda synth fixture only emits transactions, not the lambda
    // metric fields required to populate KPI values, so this assertion is
    // shape-only. Extending the fixture with `faas.*` / cloud.* numeric
    // fields and asserting populated values is tracked as a follow-up.
    apiTest(
      'AWS Lambda serverless summary responds 200 and exposes the documented KPI keys',
      async ({ apiClient }) => {
        const response = await apiClient.get(
          `internal/apm/services/${
            testData.SERVICE_AWS_LAMBDA
          }/metrics/serverless/summary?${buildQuery({
            start: testData.START_DATE,
            end: testData.END_DATE,
            environment: 'ENVIRONMENT_ALL',
            kuery: '',
          })}`,
          {
            headers: cookieHeaders,
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        const body = response.body as Record<string, unknown>;
        const keys = Object.keys(body);
        expect(keys).toContain('serverlessFunctionsTotal');
        expect(keys).toContain('serverlessDurationAvg');
        expect(keys).toContain('billedDurationAvg');
      }
    );
  }
);
