/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityInstancesQuery } from '.';

describe('getEntityInstancesQuery', () => {
  describe('getEntityInstancesQuery', () => {
    it('generates a valid esql query', () => {
      const query = getEntityInstancesQuery({
        source: {
          type: 'service',
          index_patterns: ['logs-*', 'metrics-*'],
          identity_fields: ['service.name'],
          metadata_fields: ['host.name'],
          filters: [],
          timestamp_field: 'custom_timestamp_field',
        },
        limit: 5,
        start: '2024-11-20T19:00:00.000Z',
        end: '2024-11-20T20:00:00.000Z',
      });

      expect(query).toEqual(
        'FROM logs-*,metrics-*|' +
          'WHERE custom_timestamp_field >= "2024-11-20T19:00:00.000Z"|' +
          'WHERE custom_timestamp_field <= "2024-11-20T20:00:00.000Z"|' +
          'WHERE service.name IS NOT NULL|' +
          'STATS entity.last_seen_timestamp=MAX(custom_timestamp_field),metadata.host.name=VALUES(host.name) BY service.name|' +
          'SORT entity.last_seen_timestamp DESC|' +
          'LIMIT 5'
      );
    });
  });
});
