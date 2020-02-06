/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  elasticsearchServiceMock,
  loggingServiceMock,
} from '../../../../../../src/core/server/mocks';
import { ResolverSearchHandler, Total } from './search_handler';
import { IScopedClusterClient } from 'kibana/server';
import { EndpointAppContext } from '../../types';
import { EndpointConfigSchema } from '../../config';
import { PaginationInfo, getPagination } from './query_builder';
import { CountResponse } from 'elasticsearch';
import { ResolverDataHit, parsePhase0EntityID, buildPhase0EntityID } from './common';
import { ResolverData } from '../../../common/types';
import { EventBuilder } from './event_builder.test';
import { Phase0Builder } from './phase0_builder.test';
import { Phase1Builder } from './phase1_builder.test';

function buildPageInfo(page?: number, pageSize?: number): PaginationInfo {
  return {
    page,
    pageSize,
  };
}

function buildCountResponse(count: number, scopedClient: jest.Mocked<IScopedClusterClient>) {
  scopedClient.callAsCurrentUser.mockImplementationOnce(() =>
    Promise.resolve({
      count,
      _shards: {
        total: 1,
        successful: 1,
        failed: 0,
        skipped: 0,
      },
    } as CountResponse)
  );
}

interface BuiltHits {
  total: number;
  hits: ResolverDataHit[];
  data: ResolverData[];
}

function buildResolverHits(
  builder: EventBuilder,
  numNodes: number,
  eventsPerNode: number
): BuiltHits {
  const hits: ResolverDataHit[] = [];
  const data: ResolverData[] = [];
  // start after the entity id so there aren't any collisions
  let nodeIter = builder.startingChildrenEntityID() + 1;
  for (; nodeIter < numNodes + builder.startingChildrenEntityID() + 1; nodeIter++) {
    for (let i = 0; i < eventsPerNode; i++) {
      const event = builder.buildEvent();
      hits.push({
        _source: event,
      });
      data.push(event);
    }
  }

  // build the events for the origin
  for (let i = 0; i < eventsPerNode; i++) {
    const event = builder.buildEvent();
    hits.push({
      _source: event,
    });
    data.push(event);
  }
  return { total: (numNodes + 1) * eventsPerNode, hits, data };
}

function buildResolverP0Hits(
  endpointID: string,
  entityID: number,
  parentEntityID: number,
  numNodes: number,
  eventsPerNode: number
): BuiltHits {
  return buildResolverHits(
    new Phase0Builder(endpointID, entityID, parentEntityID),
    numNodes,
    eventsPerNode
  );
}
function buildResolverP1Hits(
  entityID: string,
  parentID: string,
  numNodes: number,
  eventsPerNode: number
): BuiltHits {
  return buildResolverHits(new Phase1Builder(entityID, parentID), numNodes, eventsPerNode);
}

function createTotal(total: number, relationEqual: boolean): Total {
  return {
    value: total,
    relation: relationEqual ? 'eq' : 'gte',
  };
}

describe('build resolver node and related event responses', () => {
  let mockScopedClient: jest.Mocked<IScopedClusterClient>;
  let endpointContext: EndpointAppContext;
  let total: number;
  let hits: ResolverDataHit[];
  let data: ResolverData[];
  beforeEach(() => {
    mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();
    endpointContext = {
      logFactory: loggingServiceMock.create(),
      config: () =>
        Promise.resolve(
          EndpointConfigSchema.validate({
            resolverResultListDefaultFirstPageIndex: 0,
            resolverResultListDefaultPageSize: 10,
          })
        ),
    };
  });
  describe('phase 1 responses', () => {
    const entityID = '12345';
    const parentEntityID = '5555';
    describe('single node retrieval', () => {
      beforeEach(() => {
        ({ total, hits, data } = buildResolverP1Hits(
          entityID,
          parentEntityID,
          // 0 nodes should be created because it's a request for only the specific node
          0,
          3
        ));
      });
      it('sets the response correctly for a node retrieval', async () => {
        const pageInfo = buildPageInfo(1, 50);
        const handler = new ResolverSearchHandler(
          mockScopedClient,
          endpointContext,
          pageInfo,
          {},
          entityID
        );
        const pagination = await getPagination(endpointContext, pageInfo);

        const res = await handler.buildNodeResponse(hits, createTotal(total, true));
        expect(res.node.parent_entity_id).toBe(parentEntityID);
        expect(res.node.entity_id).toBe(entityID);
        expect(res.node.events).toStrictEqual(data);
        expect(res.total).toBe(total);

        expect(res.request_from_index).toBe(pagination.from);
        expect(res.request_page_index).toBe(pagination.page);
        expect(res.request_page_size).toBe(pagination.pageSize);
      });
    });
    describe('multiple node retrieval', () => {
      // TODO multiple phase 1 nodes in a response
    });
  });

  describe('phase 0 responses', () => {
    const phase0ID = 'endgame|12345|5';
    const { endpointID, uniquePID } = parsePhase0EntityID(phase0ID);
    const uniquePIDNum = Number(uniquePID);
    const parentUniquePID = 999;
    const parentID = buildPhase0EntityID(endpointID, parentUniquePID);
    describe('multiple node retrieval', () => {
      // TODO multiple phase 0 nodes in a response
    });
    describe('single node retrieval', () => {
      beforeEach(() => {
        ({ total, hits, data } = buildResolverP0Hits(
          endpointID,
          uniquePIDNum,
          parentUniquePID,
          // 0 nodes should be created because it's a request for only the specific node
          0,
          3
        ));
      });
      it('sets the response correctly for a node retrieval', async () => {
        const pageInfo = buildPageInfo(1, 50);
        const handler = new ResolverSearchHandler(
          mockScopedClient,
          endpointContext,
          pageInfo,
          {},
          phase0ID
        );
        const pagination = await getPagination(endpointContext, pageInfo);

        const res = await handler.buildNodeResponse(hits, createTotal(total, true));
        expect(res.node.parent_entity_id).toBe(parentID);
        expect(res.node.entity_id).toBe(phase0ID);
        expect(res.node.events).toStrictEqual(data);
        expect(res.total).toBe(total);

        expect(res.request_from_index).toBe(pagination.from);
        expect(res.request_page_index).toBe(pagination.page);
        expect(res.request_page_size).toBe(pagination.pageSize);
      });

      it('uses defaults when pagination is not defined', async () => {
        const pageInfo = buildPageInfo();
        const handler = new ResolverSearchHandler(
          mockScopedClient,
          endpointContext,
          pageInfo,
          {},
          phase0ID
        );

        const pagination = await getPagination(endpointContext, pageInfo);
        const res = await handler.buildNodeResponse(hits, createTotal(total, true));

        expect(res.total).toBe(total);

        expect(res.request_from_index).toBe(pagination.from);
        expect(res.request_page_index).toBe(pagination.page);
        expect(res.request_page_size).toBe(pagination.pageSize);
      });

      it('uses elasticsearch count call to find the total when track hits fails', async () => {
        const trueTotal = 100;
        buildCountResponse(trueTotal, mockScopedClient);
        const pageInfo = buildPageInfo();
        const handler = new ResolverSearchHandler(
          mockScopedClient,
          endpointContext,
          pageInfo,
          {},
          phase0ID
        );
        const res = await handler.buildNodeResponse(hits, createTotal(total, false));

        expect(res.total).toBe(trueTotal);
      });
    });
  });
});
