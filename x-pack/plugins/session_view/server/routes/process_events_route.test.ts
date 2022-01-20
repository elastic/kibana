/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { elasticsearchServiceMock } from '../../../../../src/core/server/elasticsearch/elasticsearch_service.mock';
import { doSearch } from './process_events_route';
const getEmptyResponse = async () => {

  return {
    body: {
      hits: { 
        total: { value: 0, relation: 'eq' }, 
        hits: [] 
      } 
    }
  }
}

describe('process_events_route.ts', () => {
  describe('doSearch(client, entityId, cursor, forward)', () => {
    it('should return an empty events array for a non existant entity_id', async () => {
      const client = elasticsearchServiceMock.createElasticsearchClient(getEmptyResponse());

      const body = await doSearch(client, 'asdf', undefined);

      expect(body.events.length).toBe(0);
    });

    it('returns results for a particular session entity_id', () => {
      throw "not implemented";
    });
    
    it('has a page size which mathces Constants.PROCESS_EVENTS_PER_PAGE', () => {
      throw "not implemented";
    });
    
    it('the date of the last event in the first page can be used as a cursor for the next page', () => {
      throw "not implemented";
    });
    
    it('should allow reverse pagination by setting forward=false', () => {
      throw "not implemented";
    });
  });
});
