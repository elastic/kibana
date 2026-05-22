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
    const spans = [span({ serviceEnvironment: 'opbeans' })];
    expect(filterServiceMapSpansByEnvironment(spans, 'opbeans')).toEqual(spans);
  });

  it('drops spans whose source service env mismatches', () => {
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
