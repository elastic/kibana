/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { elasticsearchServiceMock } from '../../../../../src/core/server/elasticsearch/elasticsearch_service.mock';
import { doSearch } from './process_events_route';

describe('process_events_route.ts', () => {
  beforeEach(() => {
  });

  describe('doSearch(client, entityId, cursor, forward)', () => {
    describe('with non existant session entity_id', () => {
      it('should return an empty events array', async () => {
        const client = elasticsearchServiceMock.createScopedClusterClient();
        const body = await doSearch(client, 'asdf', undefined);

        expect(body.events.length).toBe(0);
      });

    });
  });
});
