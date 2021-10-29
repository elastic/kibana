/*
 * copyright elasticsearch b.v. and/or licensed to elasticsearch b.v. under one
 * or more contributor license agreements. licensed under the elastic license
 * 2.0; you may not use this file except in compliance with the elastic license
 * 2.0.
 */

import { service, timerange } from '@elastic/apm-synthtrace';

export default function generateData({
  from,
  to,
}: {
  from: number;
  to: number;
}) {
  const instanceA = service('synth-go', 'production', 'go').instance(
    'instance-a'
  );
  const instanceB = service('synth-node', 'production', 'nodejs').instance(
    'instance-b'
  );

  const traceEventsA = timerange(from, to)
    .interval('1m')
    .rate(10)
    .flatMap((timestamp) =>
      instanceA
        .transaction('GET /api/product/list')
        .timestamp(timestamp)
        .duration(1000)
        .success()
        .children(
          instanceA
            .span('GET apm-*/_search', 'db', 'elasticsearch')
            .timestamp(timestamp + 50)
            .duration(900)
            .destination('elasticsearch')
            .success()
        )
        .serialize()
    );
  const traceEventsB = timerange(from, to)
    .interval('1m')
    .rate(10)
    .flatMap((timestamp) =>
      instanceB
        .transaction('GET /api/product/list')
        .timestamp(timestamp)
        .duration(1000)
        .success()
        .children(
          instanceB
            .span('GET apm-*/_search', 'db', 'elasticsearch')
            .timestamp(timestamp + 50)
            .duration(900)
            .destination('elasticsearch')
            .success()
        )
        .serialize()
    );

  const metricsetsA = timerange(from, to)
    .interval('30s')
    .rate(1)
    .flatMap((timestamp) =>
      instanceA
        .appMetrics({
          'system.memory.actual.free': 800,
          'system.memory.total': 1000,
          'system.cpu.total.norm.pct': 0.6,
          'system.process.cpu.total.norm.pct': 0.7,
        })
        .timestamp(timestamp)
        .serialize()
    );
  const metricsetsB = timerange(from, to)
    .interval('30s')
    .rate(1)
    .flatMap((timestamp) =>
      instanceB
        .appMetrics({
          'system.memory.actual.free': 800,
          'system.memory.total': 1000,
          'system.cpu.total.norm.pct': 0.6,
          'system.process.cpu.total.norm.pct': 0.7,
        })
        .timestamp(timestamp)
        .serialize()
    );
  return [...traceEventsA, ...traceEventsB, ...metricsetsA, ...metricsetsB];
}
