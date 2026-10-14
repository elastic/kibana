/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { EVALS_TRACE_URL, type GetTraceResponse } from '@kbn/evals-common';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { SupertestWithRoleScopeType } from '../../services';
import { getEvalsApiClientForRole } from './helpers/api_client';
import { seedTrace, uniqueSuffix } from './helpers/fixtures';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const es = getService('es');

  let adminClient: SupertestWithRoleScopeType;
  let viewerClient: SupertestWithRoleScopeType;

  const tracePath = (traceId: string) =>
    EVALS_TRACE_URL.replace('{traceId}', encodeURIComponent(traceId));

  describe('Evals - Traces', function () {
    const suffix = uniqueSuffix();
    const traceIndex = `traces-evals-ftr-${suffix}`;
    const traceId = `trace-${suffix}`;
    const startTime = '2024-01-01T00:00:00.000Z';

    before(async () => {
      adminClient = await getEvalsApiClientForRole(roleScopedSupertest, 'admin');
      viewerClient = await getEvalsApiClientForRole(roleScopedSupertest, 'viewer');

      await seedTrace(es, traceIndex, traceId, [
        {
          spanId: 'span-1',
          name: 'root span',
          kind: 'SERVER',
          statusCode: 'OK',
          timestamp: startTime,
          durationNanos: 5_000_000, // 5ms
          attributes: { 'service.name': 'evals-ftr' },
        },
        {
          spanId: 'span-2',
          parentSpanId: 'span-1',
          name: 'child span',
          kind: 'INTERNAL',
          statusCode: 'OK',
          timestamp: '2024-01-01T00:00:00.002Z',
          durationNanos: 1_000_000, // 1ms
        },
      ]);
    });

    after(async () => {
      await adminClient.destroy();
      await viewerClient.destroy();
      await es.indices.delete({ index: traceIndex }).catch(() => {
        // best-effort cleanup
      });
    });

    it('returns the ordered spans and derived durations for a trace', async () => {
      const { body } = await adminClient.get(tracePath(traceId)).expect(200);

      const trace = body as GetTraceResponse;
      expect(trace.trace_id).to.eql(traceId);
      expect(trace.total_spans).to.eql(2);
      expect(trace.spans.length).to.eql(2);
      // sorted by @timestamp asc, so the root span comes first
      expect(trace.spans[0].span_id).to.eql('span-1');
      expect(trace.spans[0].duration_ms).to.eql(5);
      expect(trace.spans[1].span_id).to.eql('span-2');
      expect(trace.spans[1].parent_span_id).to.eql('span-1');
      expect(trace.spans[1].duration_ms).to.eql(1);
      // earliest start to latest end = 5ms
      expect(trace.duration_ms).to.eql(5);
    });

    // the route resolves spans by trace id, so an unknown id is a valid empty result (200), not a 404
    it('returns an empty span list for an unknown trace', async () => {
      const { body } = await adminClient.get(tracePath(`missing-${suffix}`)).expect(200);

      const trace = body as GetTraceResponse;
      expect(trace.total_spans).to.eql(0);
      expect(trace.spans).to.eql([]);
    });

    it('allows reading a trace with read_evals privileges (viewer)', async () => {
      const { body } = await viewerClient.get(tracePath(traceId)).expect(200);

      const trace = body as GetTraceResponse;
      expect(trace.trace_id).to.eql(traceId);
      expect(trace.total_spans).to.eql(2);
    });
  });
}
