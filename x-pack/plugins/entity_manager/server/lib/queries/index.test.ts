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
        sources: [
          {
            type: 'service',
            index_patterns: ['logs-*'],
            identity_fields: ['service.name'],
            metadata_fields: ['host.name'],
            filters: [],
            timestamp_field: '@timestamp',
          },
          {
            type: 'service',
            index_patterns: ['other-sources*'],
            identity_fields: ['custom.service.name'],
            metadata_fields: ['owner'],
            filters: [],
            timestamp_field: 'custom_timestamp_field',
          },
        ],
        limit: 5,
        start: '2024-11-20T19:00:00.000Z',
        end: '2024-11-20T20:00:00.000Z',
        metadataFields: ['host.name', 'owner'],
      });

      expect(query).toEqual(
        'FROM logs-*, other-sources* | ' +
          'EVAL entity.id = CASE(service.name IS NOT NULL, service.name, custom.service.name IS NOT NULL, custom.service.name) | ' +
          'EVAL entity.timestamp = CASE(@timestamp IS NOT NULL, @timestamp, custom_timestamp_field IS NOT NULL, custom_timestamp_field) | ' +
          'WHERE entity.id IS NOT NULL AND entity.timestamp IS NOT NULL | ' +
          'WHERE (@timestamp >= "2024-11-20T19:00:00.000Z" AND @timestamp <= "2024-11-20T20:00:00.000Z") OR (custom_timestamp_field >= "2024-11-20T19:00:00.000Z" AND custom_timestamp_field <= "2024-11-20T20:00:00.000Z") | ' +
          'STATS entity.last_seen_timestamp=MAX(entity.timestamp), service.name=TOP(service.name, 1, "desc"), custom.service.name=TOP(custom.service.name, 1, "desc"), metadata.host.name=VALUES(host.name), metadata.owner=VALUES(owner) BY entity.id | ' +
          'SORT entity.last_seen_timestamp DESC | ' +
          'LIMIT 5'
      );
    });
  });
});
