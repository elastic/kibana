/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapSpan } from '../../../../common/service_map';
import { filterServiceMapSpansByEnvironment } from './filter_service_map_spans_by_environment';

function span(overrides: Partial<ServiceMapSpan>): ServiceMapSpan {
  return {
    spanId: 'span-1',
    spanType: 'external',
    spanSubtype: 'http',
    spanDestinationServiceResource: 'opbeans:3000',
    serviceName: 'opbeans-go',
    agentName: 'go',
    serviceEnvironment: 'opbeans',
    ...overrides,
  };
}

describe('filterServiceMapSpansByEnvironment', () => {
  it('keeps spans where the source service matches the requested env (no destination)', () => {
    // The bulk of trace docs land here — a service emitting an external span (DB,
    // HTTP dependency etc.) with no APM destination service. These have no
    // destination env to compare against and shouldn't be dropped.
    const spans = [span({ serviceEnvironment: 'opbeans' })];
    expect(filterServiceMapSpansByEnvironment(spans, 'opbeans')).toEqual(spans);
  });

  it('drops spans whose source service env mismatches', () => {
    // Defensive case: trace fan-out can include spans whose *source* is in a
    // sibling env even though the trace was picked up by an env filter — e.g.
    // an opbeans-env trace that traverses through a production-env service.
    const filtered = filterServiceMapSpansByEnvironment(
      [
        span({ serviceName: 'opbeans-go', serviceEnvironment: 'opbeans' }),
        span({ serviceName: 'opbeans-dotnet', serviceEnvironment: 'production' }),
      ],
      'opbeans'
    );
    expect(filtered.map((s) => s.serviceName)).toEqual(['opbeans-go']);
  });

  it('keeps spans whose source env is undefined (legacy / unconfigured docs)', () => {
    // We can't prove these docs are in the wrong env, so keep them — dropping
    // would silently hide services that simply lack `service.environment`.
    const filtered = filterServiceMapSpansByEnvironment(
      [
        span({ serviceName: 'opbeans-go', serviceEnvironment: 'opbeans' }),
        span({ serviceName: 'legacy-svc', serviceEnvironment: undefined }),
      ],
      'opbeans'
    );
    expect(filtered.map((s) => s.serviceName)).toEqual(['opbeans-go', 'legacy-svc']);
  });

  it('drops spans whose destination service is in a sibling env', () => {
    // This is the bug the helper exists to fix: opbeans-go (opbeans) → opbeans-dotnet
    // (production) within a single trace pulls opbeans-dotnet into the response even
    // though no opbeans-env doc for it exists.
    const filtered = filterServiceMapSpansByEnvironment(
      [
        span({
          serviceName: 'opbeans-go',
          serviceEnvironment: 'opbeans',
          destinationService: {
            serviceName: 'opbeans-dotnet',
            agentName: 'dotnet',
            serviceEnvironment: 'production',
          },
        }),
      ],
      'opbeans'
    );
    expect(filtered).toEqual([]);
  });

  it('keeps spans whose destination has no env (dependency / external resource)', () => {
    // Dependencies (sqlite, postgresql, kafka topics …) don't carry
    // `service.environment` — they're not APM services. They must always pass
    // the filter regardless of the requested env.
    const filtered = filterServiceMapSpansByEnvironment(
      [
        span({
          serviceName: 'opbeans-go',
          serviceEnvironment: 'opbeans',
          spanDestinationServiceResource: 'sqlite/main',
          destinationService: undefined,
        }),
      ],
      'opbeans'
    );
    expect(filtered).toHaveLength(1);
  });

  it('keeps spans whose destination env is undefined even if a destinationService is set', () => {
    // Edge case: APM destination service whose `service.environment` field is
    // missing. Treat same as legacy data — keep it.
    const filtered = filterServiceMapSpansByEnvironment(
      [
        span({
          serviceName: 'opbeans-go',
          serviceEnvironment: 'opbeans',
          destinationService: {
            serviceName: 'opbeans-node',
            agentName: 'nodejs',
            serviceEnvironment: undefined,
          },
        }),
      ],
      'opbeans'
    );
    expect(filtered).toHaveLength(1);
  });

  it('keeps everything when source and destination envs both match', () => {
    // Sanity: nothing gets stripped when the trace is entirely within the
    // requested env — the helper should be a no-op for that input.
    const spans = [
      span({
        serviceName: 'opbeans-go',
        serviceEnvironment: 'opbeans',
        destinationService: {
          serviceName: 'opbeans-node',
          agentName: 'nodejs',
          serviceEnvironment: 'opbeans',
        },
      }),
      span({
        serviceName: 'opbeans-node',
        serviceEnvironment: 'opbeans',
        spanDestinationServiceResource: 'postgresql',
        destinationService: undefined,
      }),
    ];
    expect(filterServiceMapSpansByEnvironment(spans, 'opbeans')).toEqual(spans);
  });
});
