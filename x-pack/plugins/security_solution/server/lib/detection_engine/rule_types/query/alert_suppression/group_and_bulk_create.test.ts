/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { buildBucketHistoryFilter, filterBucketHistory } from './group_and_bulk_create';
import type { BucketHistory } from './group_and_bulk_create';

describe('groupAndBulkCreate utils', () => {
  const bucketHistory: BucketHistory[] = [
    {
      key: {
        'host.name': 'host-0',
        'source.ip': '127.0.0.1',
      },
      endDate: '2022-11-01T12:00:00Z',
    },
    {
      key: {
        'host.name': 'host-1',
        'source.ip': '192.0.0.1',
      },
      endDate: '2022-11-01T12:05:00Z',
    },
  ];

  it('buildBucketHistoryFilter should create the expected query', () => {
    const from = moment('2022-11-01T11:30:00Z');

    const filter = buildBucketHistoryFilter({
      bucketHistory,
      primaryTimestamp: '@timestamp',
      secondaryTimestamp: undefined,
      from,
    });

    expect(filter).toMatchSnapshot();
  });

  it('filterBucketHistory should remove outdated buckets', () => {
    const fromDate = new Date('2022-11-01T12:02:00Z');

    const filteredBuckets = filterBucketHistory({ bucketHistory, fromDate });

    expect(filteredBuckets).toEqual([
      {
        key: {
          'host.name': 'host-1',
          'source.ip': '192.0.0.1',
        },
        endDate: '2022-11-01T12:05:00Z',
      },
    ]);
  });
});
