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
        'FROM logs-*, other-sources* METADATA _index | ' +
          'EVAL is_source_0 = (_index LIKE "*logs-**") AND (service.name IS NOT NULL) AND (@timestamp IS NOT NULL) | ' +
          'EVAL is_source_1 = (_index LIKE "*other-sources**") AND (custom.service.name IS NOT NULL) AND (custom_timestamp_field IS NOT NULL) | ' +
          'EVAL entity.id = CASE(is_source_0, service.name, is_source_1, custom.service.name) | ' +
          'EVAL entity.timestamp = CASE(is_source_0, @timestamp, is_source_1, custom_timestamp_field) | ' +
          'WHERE entity.id IS NOT NULL | ' +
          'WHERE (is_source_0 AND (@timestamp >= "2024-11-20T19:00:00.000Z" AND @timestamp <= "2024-11-20T20:00:00.000Z")) OR ' +
          '(is_source_1 AND (custom_timestamp_field >= "2024-11-20T19:00:00.000Z" AND custom_timestamp_field <= "2024-11-20T20:00:00.000Z")) | ' +
          'STATS entity.last_seen_timestamp=MAX(entity.timestamp), service.name=TOP(service.name, 1, "desc"), custom.service.name=TOP(custom.service.name, 1, "desc"), metadata.host.name=VALUES(host.name), metadata.owner=VALUES(owner) BY entity.id | ' +
          'SORT entity.last_seen_timestamp DESC | ' +
          'LIMIT 5'
      );
    });
  });
});
