/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationSeed } from '@kbn/investigation-seed';
import type { APMDownstreamDependency } from '@kbn/apm-types';
import {
  MAX_DEPENDENCIES,
  MAX_HOSTS,
  MAX_LEADS,
  apmAnomalyApplicability,
  apmChangePointApplicability,
  capLeads,
  leadFromAnomaly,
  leadFromChangePoint,
  selectDependencies,
  selectHosts,
} from './change_point_leads';

const seed = (serviceName?: string): InvestigationSeed => ({
  origin: { app: 'alerts', alertId: 'alert-1', ruleTypeId: 'apm.threshold' },
  timeRange: { from: '2026-11-02T11:00:00.000Z', to: '2026-11-02T12:00:00.000Z' },
  filters: [],
  entities: serviceName ? { 'service.name': serviceName } : {},
});

const dependency = (name: string, throughputPerMin: number): APMDownstreamDependency =>
  ({
    'span.destination.service.resource': name,
    throughputPerMin,
  } as APMDownstreamDependency);

describe('APM change point leads', () => {
  it('is not applicable without a service name', () => {
    expect(apmChangePointApplicability(seed()).applicable).toBe(false);
    expect(apmChangePointApplicability(seed('checkout')).applicable).toBe(true);
  });

  it('ranks a lead with separate signal, timing, and relationship bands', () => {
    const lead = leadFromChangePoint({
      analyzerId: 'service_change_points',
      metric: 'Latency',
      subject: 'checkout',
      relationship: 'service',
      relevance: 'Same service',
      change: { type: 'spike', date: '2026-11-02T10:30:00.000Z', p_value: 0.02 },
      anchorStart: '2026-11-02T11:00:00.000Z',
      anchorEnd: '2026-11-02T12:00:00.000Z',
    });

    expect(lead.ranking).toEqual({ signal: 'moderate', timing: 'before', relationship: 'service' });
  });

  it('keeps the 10 highest-throughput dependencies', () => {
    const dependencies = Array.from({ length: 12 }, (_, index) =>
      dependency(`dep-${index}`, index)
    );
    const { selected, total } = selectDependencies(dependencies);

    expect(total).toBe(12);
    expect(selected).toHaveLength(MAX_DEPENDENCIES);
    expect(selected[0]['span.destination.service.resource']).toBe('dep-11');
    expect(selected[MAX_DEPENDENCIES - 1]['span.destination.service.resource']).toBe('dep-2');
  });

  it('caps the ranked leads at 25', () => {
    const leads = Array.from({ length: 30 }, (_, index) =>
      leadFromChangePoint({
        analyzerId: 'service_change_points',
        metric: 'Latency',
        subject: 'checkout',
        relationship: 'service',
        relevance: 'Same service',
        change: {
          type: 'spike',
          date: `2026-11-02T11:${String(index).padStart(2, '0')}:00.000Z`,
          p_value: index === 0 ? 0.5 : 0.001,
        },
        anchorStart: '2026-11-02T11:00:00.000Z',
        anchorEnd: '2026-11-02T12:00:00.000Z',
      })
    );

    const capped = capLeads(leads);
    expect(capped.truncated).toBe(true);
    expect(capped.leads).toHaveLength(MAX_LEADS);
    expect(capped.leads.some((item) => item.ranking.signal === 'weak')).toBe(false);
  });

  it('deduplicates and caps host names at 10', () => {
    const hosts = ['host-0', 'host-0', ...Array.from({ length: 12 }, (_, i) => `host-${i}`)];
    const { selected, total } = selectHosts(hosts);

    expect(total).toBe(12);
    expect(selected).toHaveLength(MAX_HOSTS);
    expect(selected[0]).toBe('host-0');
    expect(selected[MAX_HOSTS - 1]).toBe('host-9');
  });

  it('reports skipped when ML is unavailable for service anomalies', () => {
    expect(apmAnomalyApplicability(seed('checkout'), false)).toEqual({
      applicable: false,
      status: 'skipped',
      message: 'Skipped: ML not available',
    });
    expect(apmAnomalyApplicability(seed('checkout'), true)).toEqual({ applicable: true });
  });

  it('maps an ML anomaly record to a ranked lead with Single Metric Viewer locator params', () => {
    const lead = leadFromAnomaly({
      anomaly: {
        '@timestamp': '2026-11-02T11:15:00.000Z',
        metricName: 'transaction_latency',
        'service.name': 'checkout',
        'service.environment': 'production' as never,
        'transaction.type': 'request',
        anomalyScore: 82.4,
        actualValue: 1200,
        expectedBoundsLower: 100,
        expectedBoundsUpper: 250,
        jobId: 'apm-production-latency',
        detectorIndex: 0,
      },
      serviceName: 'checkout',
      anchorStart: '2026-11-02T11:00:00.000Z',
      anchorEnd: '2026-11-02T12:00:00.000Z',
    });

    expect(lead.analyzerId).toBe('service_anomalies');
    expect(lead.summary).toBe('Transaction latency anomaly on checkout (request, score 82)');
    expect(lead.ranking).toEqual({
      signal: 'strong',
      timing: 'during',
      relationship: 'service',
    });
    expect(lead.id).toBe(
      'service_anomalies:apm-production-latency:checkout:request:transaction_latency:2026-11-02T11:15:00.000Z'
    );
    expect(lead.locatorParams).toEqual({
      serviceName: 'checkout',
      environment: 'production',
      transactionType: 'request',
      jobId: 'apm-production-latency',
      detectorIndex: 0,
      rangeFrom: '2026-11-02T11:00:00.000Z',
      rangeTo: '2026-11-02T12:00:00.000Z',
    });
  });
});
