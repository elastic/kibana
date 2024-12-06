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
      const { query, filter } = getEntityInstancesQuery({
        source: {
          id: 'service_source',
          type_id: 'service',
          index_patterns: ['logs-*', 'metrics-*'],
          identity_fields: ['service.name'],
          metadata_fields: ['host.name'],
          filters: [],
          timestamp_field: 'custom_timestamp_field',
          display_name: 'service.id',
        },
        limit: 5,
        start: '2024-11-20T19:00:00.000Z',
        end: '2024-11-20T20:00:00.000Z',
        sort: { field: 'entity.id', direction: 'DESC' },
      });

      expect(query).toEqual(
        'FROM logs-*, metrics-* | ' +
          'STATS host.name = VALUES(host.name::keyword), entity.last_seen_timestamp = MAX(custom_timestamp_field), service.id = MAX(service.id::keyword) BY service.name::keyword | ' +
          'RENAME `service.name::keyword` AS service.name | ' +
          'EVAL entity.type = "service", entity.id = service.name, entity.display_name = COALESCE(service.id, entity.id) | ' +
          'SORT entity.id DESC | ' +
          'LIMIT 5'
      );

      expect(filter).toEqual({
        bool: {
          filter: [
            {
              bool: {
                should: [
                  {
                    exists: {
                      field: 'service.name',
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            {
              bool: {
                filter: [
                  {
                    bool: {
                      should: [
                        {
                          range: {
                            custom_timestamp_field: {
                              gte: '2024-11-20T19:00:00.000Z',
                            },
                          },
                        },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                  {
                    bool: {
                      should: [
                        {
                          range: {
                            custom_timestamp_field: {
                              lte: '2024-11-20T20:00:00.000Z',
                            },
                          },
                        },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                ],
              },
            },
          ],
        },
      });
    });
  });
});
