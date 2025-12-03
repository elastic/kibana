/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';
import { readLogFile, assertLogContains } from '../test_utils';

function isPrWithLabel(match: string): boolean {
  const labelsEnv = process.env.GITHUB_PR_LABELS ?? '';
  const labels = labelsEnv
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean);

  for (const label of labels) {
    if (label === match) {
      return true;
    }
  }

  return false;
}

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('Log Correlation', () => {
    it('Emits "trace.id" into the logs', async () => {
      if (isPrWithLabel('"ci:collect-apm"')) {
        log.warning(`Skipping test as APM is enabled in FTR, which breaks this test`);
        return;
      }

      const traceId1 = '4bf92f3577b34da6a3ce929d0e0e4736';
      const traceparent1 = `00-${traceId1}-00f067aa0ba902b7-01`;

      const response1 = await supertest
        .get('/emit_log_with_trace_id')
        .set('traceparent', traceparent1);
      expect(response1.status).to.be(200);
      expect(response1.body.traceId).to.be(traceId1);

      const traceId2 = 'a1b2c3d4e5f6789012345678901234ab';
      const traceparent2 = `00-${traceId2}-10f067aa0ba902b7-01`;
      const response2 = await supertest
        .get('/emit_log_with_trace_id')
        .set('traceparent', traceparent2);
      expect(response2.status).to.be(200);
      expect(response2.body.traceId).to.be(traceId2);

      const logs = await readLogFile();

      let responseTraceId: string | undefined;
      await assertLogContains({
        description: 'traceId included in the http logs',
        predicate: (record) => {
          // we don't check trace.id value since trace.id in the test plugin and Kibana are different on CI.
          // because different 'elastic-apm-node' instances are imported
          if (
            record.log?.logger === 'http.server.response' &&
            record.url?.path === '/emit_log_with_trace_id'
          ) {
            responseTraceId = record.trace?.id;
            return true;
          }
          return false;
        },
        logs,
      });

      expect(responseTraceId).to.be.a('string');

      await assertLogContains({
        description: 'elasticsearch logs have the same traceId',
        predicate: (record) =>
          Boolean(
            record.log?.logger === 'elasticsearch.query.data' &&
              record.trace?.id === responseTraceId &&
              // esClient.ping() request
              record.message?.includes('HEAD /')
          ),
        logs,
      });
    });
  });
}
