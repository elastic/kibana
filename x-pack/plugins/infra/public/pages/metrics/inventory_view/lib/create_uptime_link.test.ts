/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createUptimeLink } from './create_uptime_link';
import { InfraWaffleMapOptions, InfraFormatterType } from '../../../../lib/lib';
import { SnapshotMetricType } from '../../../../../common/inventory_models/types';

const options: InfraWaffleMapOptions = {
  fields: {
    container: 'container.id',
    pod: 'kubernetes.pod.uid',
    host: 'host.name',
    message: ['@message'],
    timestamp: '@timestanp',
    tiebreaker: '@timestamp',
  },
  formatter: InfraFormatterType.percent,
  formatTemplate: '{{value}}',
  metric: { type: 'cpu' },
  groupBy: [],
  sort: { by: 'name', direction: 'asc' },
  legend: {
    type: 'gradient',
    rules: [],
  },
};

describe('createUptimeLink()', () => {
  it('should work for hosts with ip', () => {
    const node = {
      pathId: 'host-01',
      id: 'host-01',
      name: 'host-01',
      ip: '10.0.1.2',
      path: [],
      metrics: [
        {
          name: 'cpu' as SnapshotMetricType,
          value: 0.5,
          max: 0.8,
          avg: 0.6,
        },
      ],
    };
    expect(createUptimeLink(options, 'host', node)).toStrictEqual({
      app: 'uptime',
      hash: '/',
      search: { search: 'host.ip:"10.0.1.2"' },
    });
  });

  it('should work for hosts without ip', () => {
    const node = {
      pathId: 'host-01',
      id: 'host-01',
      name: 'host-01',
      path: [],
      metrics: [
        {
          name: 'cpu' as SnapshotMetricType,
          value: 0.5,
          max: 0.8,
          avg: 0.6,
        },
      ],
    };
    expect(createUptimeLink(options, 'host', node)).toStrictEqual({
      app: 'uptime',
      hash: '/',
      search: { search: 'host.name:"host-01"' },
    });
  });

  it('should work for pods', () => {
    const node = {
      pathId: 'pod-01',
      id: '29193-pod-02939',
      name: 'pod-01',
      path: [],
      metrics: [
        {
          name: 'cpu' as SnapshotMetricType,
          value: 0.5,
          max: 0.8,
          avg: 0.6,
        },
      ],
    };
    expect(createUptimeLink(options, 'pod', node)).toStrictEqual({
      app: 'uptime',
      hash: '/',
      search: { search: 'kubernetes.pod.uid:"29193-pod-02939"' },
    });
  });

  it('should work for container', () => {
    const node = {
      pathId: 'docker-01',
      id: 'docker-1234',
      name: 'docker-01',
      path: [],
      metrics: [
        {
          name: 'cpu' as SnapshotMetricType,
          value: 0.5,
          max: 0.8,
          avg: 0.6,
        },
      ],
    };
    expect(createUptimeLink(options, 'container', node)).toStrictEqual({
      app: 'uptime',
      hash: '/',
      search: { search: 'container.id:"docker-1234"' },
    });
  });
});
