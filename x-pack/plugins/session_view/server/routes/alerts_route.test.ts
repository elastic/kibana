/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { elasticsearchServiceMock } from 'src/core/server/mocks';
import { doSearch } from './alerts_route';
import { mockEvents } from '../../common/mocks/constants/session_view_process.mock';

const getEmptyResponse = async () => {
  return {
    hits: {
      total: { value: 0, relation: 'eq' },
      hits: [],
    },
  };
};

const getResponse = async () => {
  return {
    hits: {
      total: { value: mockEvents.length, relation: 'eq' },
      hits: mockEvents.map((event) => {
        return { _source: event };
      }),
    },
  };
};

describe('alerts_route.ts', () => {
  describe('doSearch(client, sessionEntityId)', () => {
    it('should return an empty events array for a non existant entity_id', async () => {
      const client = elasticsearchServiceMock.createElasticsearchClient(getEmptyResponse());

      const body = await doSearch(client, 'asdf');

      expect(body.alerts.length).toBe(0);
    });

    it('returns results for a particular session entity_id', async () => {
      const client = elasticsearchServiceMock.createElasticsearchClient(getResponse());

      const body = await doSearch(client, 'mockId');

      expect(body.alerts.length).toBe(mockEvents.length);
    });
  });
});
