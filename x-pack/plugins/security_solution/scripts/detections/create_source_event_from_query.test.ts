/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression } from '@kbn/es-query';
import { createEventFromKueryNode } from './create_source_event_from_query';

describe('createEventFromKueryNode', () => {
  it('creates event for common keys', () => {
    const query =
      'event.category:(network or network_traffic) and (event.type:connection or type:dns) and (destination.port:53 or event.dataset:zeek.dns)\n  and source.ip:(\n    10.0.0.0/8 or\n    172.16.0.0/12 or\n    192.168.0.0/16\n  ) and\n  not destination.ip:(\n    10.0.0.0/8 or\n    127.0.0.0/8 or\n    169.254.0.0/16 or\n    172.16.0.0/12 or\n    192.0.0.0/24 or\n    192.0.0.0/29 or\n    192.0.0.8/32 or\n    192.0.0.9/32 or\n    192.0.0.10/32 or\n    192.0.0.170/32 or\n    192.0.0.171/32 or\n    192.0.2.0/24 or\n    192.31.196.0/24 or\n    192.52.193.0/24 or\n    192.168.0.0/16 or\n    192.88.99.0/24 or\n    224.0.0.0/4 or\n    100.64.0.0/10 or\n    192.175.48.0/24 or\n    198.18.0.0/15 or\n    198.51.100.0/24 or\n    203.0.113.0/24 or\n    240.0.0.0/4 or\n    "::1" or\n    "FE80::/10" or\n    "FF00::/8"\n  )\n';
    const kqlQuery = fromKueryExpression(query);
    const sourceEvent = createEventFromKueryNode(kqlQuery);

    expect(sourceEvent).toEqual({
      event: {
        category: 'network',
        type: 'connection',
      },
      destination: {
        port: 53,
      },
      source: {
        ip: '10.0.0.0',
      },
    });
  });
});
