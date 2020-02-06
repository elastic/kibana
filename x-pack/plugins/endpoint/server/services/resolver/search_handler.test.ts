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
import { ResolverData, Pagination } from '../../../common/types';
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
  children: ResolverData[];
  origin: ResolverData[];
}

function buildResolverHits(
  builder: EventBuilder,
  numNodes: number,
  eventsPerNode: number
): BuiltHits {
  const hits: ResolverDataHit[] = [];
  const children: ResolverData[] = [];
  const origin: ResolverData[] = [];
  // start after the entity id so there aren't any collisions
  let nodeIter = builder.startingChildrenEntityID();
  for (; nodeIter < numNodes + builder.startingChildrenEntityID(); nodeIter++) {
    for (let i = 0; i < eventsPerNode; i++) {
      const event = builder.buildEvent(nodeIter);
      hits.push({
        _source: event,
      });
      children.push(event);
    }
  }

  // build the events for the origin
  for (let i = 0; i < eventsPerNode; i++) {
    const event = builder.buildEvent(builder.originEntityID);
    hits.push({
      _source: event,
    });
    origin.push(event);
  }
  // +1 because we're generating events for the origin too
  return { total: (numNodes + 1) * eventsPerNode, hits, children, origin };
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
  return buildResolverHits(new Phase1Builder(Number(entityID), parentID), numNodes, eventsPerNode);
}

function createTotal(total: number, relationEqual: boolean): Total {
  return {
    value: total,
    relation: relationEqual ? 'eq' : 'gte',
  };
}

async function checkPagination(
  resPagination: Pagination,
  context: EndpointAppContext,
  total: number,
  builtPageInfo: PaginationInfo
) {
  const pagination = await getPagination(context, builtPageInfo);
  expect(resPagination.total).toBe(total);

  expect(resPagination.request_from_index).toBe(pagination.from);
  expect(resPagination.request_page_index).toBe(pagination.page);
  expect(resPagination.request_page_size).toBe(pagination.pageSize);
}

describe('build resolver node and related event responses', () => {
  let mockScopedClient: jest.Mocked<IScopedClusterClient>;
  let endpointContext: EndpointAppContext;
  let total: number;
  let hits: ResolverDataHit[];
  let children: ResolverData[];
  let origin: ResolverData[];
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
        ({ total, hits, children, origin } = buildResolverP1Hits(
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

        const res = await handler.buildNodeResponse(hits, createTotal(total, true));
        expect(res.node.parent_entity_id).toBe(parentEntityID);
        expect(res.node.entity_id).toBe(entityID);
        expect(res.node.events).toStrictEqual(origin);
        await checkPagination(res, endpointContext, total, pageInfo);
      });
    });
    describe('multiple node retrieval', () => {
      beforeEach(() => {
        ({ total, hits, children, origin } = buildResolverP1Hits(entityID, parentEntityID, 3, 3));
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

        const res = await handler.buildChildrenResponse(hits, createTotal(total, true));
        expect(res.origin.parent_entity_id).toBe(parentEntityID);
        expect(res.origin.entity_id).toBe(entityID);
        expect(res.origin.events).toStrictEqual(origin);
        // built 3 children nodes in before each call
        expect(res.children.length).toBe(3);
        await checkPagination(res, endpointContext, total, pageInfo);
      });
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
        ({ total, hits, children, origin } = buildResolverP0Hits(
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

        const res = await handler.buildNodeResponse(hits, createTotal(total, true));
        expect(res.node.parent_entity_id).toBe(parentID);
        expect(res.node.entity_id).toBe(phase0ID);
        expect(res.node.events).toStrictEqual(origin);
        await checkPagination(res, endpointContext, total, pageInfo);
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

        const res = await handler.buildNodeResponse(hits, createTotal(total, true));

        await checkPagination(res, endpointContext, total, pageInfo);
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
