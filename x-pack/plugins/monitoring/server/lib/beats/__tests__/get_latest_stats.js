/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleResponse } from '../get_latest_stats';
import expect from '@kbn/expect';

describe('beats/get_latest_stats', () => {
  it('Handle empty response', () => {
    expect(handleResponse()).to.eql({
      latestActive: [
        {
          range: 'last1m',
          count: undefined,
        },
        {
          range: 'last5m',
          count: undefined,
        },
        {
          range: 'last20m',
          count: undefined,
        },
        {
          range: 'last1h',
          count: undefined,
        },
        {
          range: 'last1d',
          count: undefined,
        },
      ],
      latestTypes: [],
      latestVersions: [],
    });
  });

  it('Summarizes response data', () => {
    const response = {
      aggregations: {
        active_counts: {
          buckets: [
            { key: 'last1m', uuids: { buckets: new Array(10) } },
            { key: 'last5m', uuids: { buckets: new Array(11) } },
            { key: 'last20m', uuids: { buckets: new Array(12) } },
            { key: 'last1h', uuids: { buckets: new Array(13) } },
            { key: 'last1d', uuids: { buckets: new Array(15) } },
          ],
        },
      },
    };

    expect(handleResponse(response)).to.eql({
      latestActive: [
        { range: 'last1m', count: 10 },
        { range: 'last5m', count: 11 },
        { range: 'last20m', count: 12 },
        { range: 'last1h', count: 13 },
        { range: 'last1d', count: 15 },
      ],
      latestTypes: [],
      latestVersions: [],
    });
  });
});
