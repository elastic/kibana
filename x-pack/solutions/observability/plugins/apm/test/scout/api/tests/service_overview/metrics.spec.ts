/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import {
  APM_METRICS_SERVICE_NAMES,
  RUBY_JRUBY_METRICS,
} from '@kbn/synthtrace/src/scenarios/helpers/apm_metrics_dashboards';
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
  'APM Service Metrics API - value assertions',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let cookieHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      cookieHeaders = { ...COMMON_HEADERS, ...cookieHeader };
    });

    apiTest('JVM nodes table is populated for the JRuby service', async ({ apiClient }) => {
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
    });

    apiTest('Charts endpoint returns CPU + memory series for JRuby', async ({ apiClient }) => {
      const serviceName = APM_METRICS_SERVICE_NAMES.RUBY_JRUBY;
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

      // Every returned chart key should expose at least one series so we know
      // the synth metrics flowed through the agent-specific transform.
      for (const chart of body.charts) {
        expect(chart.series.length).toBeGreaterThan(0);
      }

      const chartKeys = body.charts.map((chart) => chart.key);
      expect(chartKeys).toContain('cpu_usage_chart');
      expect(chartKeys).toContain('memory_usage_chart');
    });

    apiTest(
      'Serverless summary endpoint responds 200 for AWS Lambda',
      async ({ apiClient }) => {
        // The aws_lambda synth fixture only emits transactions, not the lambda
        // metric fields required to populate the summary KPIs. We still assert
        // the endpoint is reachable + shaped correctly so any future regression
        // in the route handler shows up here.
        const response = await apiClient.get(
          `internal/apm/services/${testData.SERVICE_AWS_LAMBDA}/metrics/serverless/summary?${buildQuery(
            {
              start: testData.START_DATE,
              end: testData.END_DATE,
              environment: 'ENVIRONMENT_ALL',
              kuery: '',
            }
          )}`,
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
