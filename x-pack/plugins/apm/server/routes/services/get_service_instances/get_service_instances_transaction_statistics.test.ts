/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { InstancesSortField } from '../../../../common/instances';
import { getOrderInstructions } from './get_service_instances_transaction_statistics';

describe('getOrderInstructions', () => {
  (
    [
      {
        field: 'errorRate',
        direction: 'asc',
        expectValue: { failures: 'asc', _count: 'desc' },
      },
      {
        field: 'errorRate',
        direction: 'desc',
        expectValue: { failures: 'desc', _count: 'asc' },
      },
      {
        field: 'latency',
        direction: 'asc',
        expectValue: { latency: 'asc' },
      },
      {
        field: 'latency',
        direction: 'desc',
        expectValue: { latency: 'desc' },
      },
      {
        field: 'serviceNodeName',
        direction: 'asc',
        expectValue: { _key: 'asc' },
      },
      {
        field: 'serviceNodeName',
        direction: 'desc',
        expectValue: { _key: 'desc' },
      },
      {
        field: 'throughput',
        direction: 'asc',
        expectValue: { _count: 'asc' },
      },
      {
        field: 'throughput',
        direction: 'desc',
        expectValue: { _count: 'desc' },
      },
    ] as Array<{
      field: InstancesSortField;
      direction: 'asc' | 'desc';
      expectValue: Record<string, 'asc' | 'desc'>;
    }>
  ).map(({ field, direction, expectValue }) =>
    it(`returns correct order instructions for ${field} ${direction}`, () => {
      const result = getOrderInstructions(field, direction);
      expect(result).toEqual(expectValue);
    })
  );
});
