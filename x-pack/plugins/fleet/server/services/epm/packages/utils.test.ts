/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssetsMap } from '../../../../common/types';

import type { RegistryDataStream } from '../../../../common';

import { resolveDataStreamFields } from './utils';

describe('resolveDataStreamFields', () => {
  const statusAssetYml = dump([
    {
      name: 'apache.status',
      type: 'group',
      fields: [
        {
          name: 'total_accesses',
          type: 'long',
          description: 'Total number of access requests.\n',
          metric_type: 'counter',
        },
        {
          name: 'uptime',
          type: 'group',
          fields: [
            {
              name: 'server_uptime',
              type: 'long',
              description: 'Server uptime in seconds.\n',
              metric_type: 'counter',
            },
            {
              name: 'uptime',
              type: 'long',
              description: 'Server uptime.\n',
              metric_type: 'counter',
            },
          ],
        },
      ],
    },
  ]);

  const dataStream = {
    dataset: 'apache.status',
    path: 'status',
  } as RegistryDataStream;

  const assetsMap = new Map([
    ['apache-1.18.0/data_stream/status/fields/fields.yml', Buffer.from(statusAssetYml)],
  ]) as AssetsMap;

  const expectedResult = {
    'apache.status': {
      'apache.status.total_accesses': {
        name: 'total_accesses',
        type: 'long',
        description: 'Total number of access requests.\n',
        metric_type: 'counter',
        flat_name: 'apache.status.total_accesses',
      },
      'apache.status.uptime.server_uptime': {
        name: 'server_uptime',
        type: 'long',
        description: 'Server uptime in seconds.\n',
        metric_type: 'counter',
        flat_name: 'apache.status.uptime.server_uptime',
      },
      'apache.status.uptime.uptime': {
        name: 'uptime',
        type: 'long',
        description: 'Server uptime.\n',
        metric_type: 'counter',
        flat_name: 'apache.status.uptime.uptime',
      },
    },
  };

  it('should load and resolve fields for the passed data stream', () => {
    expect(resolveDataStreamFields({ dataStream, assetsMap })).toEqual(expectedResult);
  });
});
