/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Including multiple test classes in this file to avoid having to put them in their own *.test.ts file. If I do that
 * CI will complain about having a test file without any tests.
 */
/* eslint-disable max-classes-per-file */

import {
  elasticsearchServiceMock,
  loggingServiceMock,
} from '../../../../../../src/core/server/mocks';
import { SingleNodeHandler } from './single_node_handler';
import { ChildrenSearchHandler } from './children_search_handler';
import { IScopedClusterClient } from 'kibana/server';
import { EndpointAppContext, Total } from '../../types';
import { EndpointConfigSchema } from '../../config';
import { PaginationInfo, getPagination } from './query_builder';
import { CountResponse } from 'elasticsearch';
import { ResolverDataHit, parseLegacyEntityID, buildLegacyEntityID } from './common';
import { ResolverData, BaseResult } from '../../../common/types';

export interface EventBuilder {
  startNewChildNode(): void;
  buildChildEvent(): ResolverData;
  buildOriginEvent(): ResolverData;
}

export class LegacyBuilder implements EventBuilder {
  private childEntityID: number;

  constructor(
    private readonly endpointID: string,
    private readonly originEntityID: number,
    private readonly originParentEntityID: number
  ) {
    this.childEntityID = this.originEntityID + 1;
  }

  private createEvent(entityID: number, parentEntityID: number) {
    return {
      endgame: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        unique_pid: entityID,
        unique_ppid: parentEntityID,
      },
      agent: {
        id: this.endpointID,
      },
    };
  }

  buildChildEvent(): ResolverData {
    const entityID = this.childEntityID;
    return this.createEvent(entityID, this.originEntityID);
  }

  startNewChildNode() {
    this.childEntityID += 1;
  }

  buildOriginEvent(): ResolverData {
    return this.createEvent(this.originEntityID, this.originParentEntityID);
  }
}

class ElasticEndpointBuilder implements EventBuilder {
  private childCounter: number = 0;
  constructor(
    private readonly originEntityID: string,
    private readonly originParentEntityID: string
  ) {}

  createEvent(entityID: string, parentEntityID: string) {
    return {
      event: {
        category: 'process',
        type: 'start',
      },
      endpoint: {
        process: {
          entity_id: entityID,
          parent: {
            entity_id: parentEntityID,
          },
        },
      },
    };
  }

  buildChildEvent(): ResolverData {
    const entityID = this.originEntityID + String(this.childCounter);
    return this.createEvent(entityID, this.originEntityID);
  }

  startNewChildNode() {
    this.childCounter += 1;
  }

  buildOriginEvent(): ResolverData {
    return this.createEvent(this.originEntityID, this.originParentEntityID);
  }
}

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
  // create the child nodes and the events for each
  for (let nodeIter = 0; nodeIter < numNodes; nodeIter++) {
    builder.startNewChildNode();
    for (let i = 0; i < eventsPerNode; i++) {
      const event = builder.buildChildEvent();
      hits.push({
        _source: event,
      });
      children.push(event);
    }
  }

  // build the events for the origin
  for (let i = 0; i < eventsPerNode; i++) {
    const event = builder.buildOriginEvent();
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
    new LegacyBuilder(endpointID, entityID, parentEntityID),
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
  return buildResolverHits(new ElasticEndpointBuilder(entityID, parentID), numNodes, eventsPerNode);
}

function createTotal(total: number, relationEqual: boolean): Total {
  return {
    value: total,
    relation: relationEqual ? 'eq' : 'gte',
  };
}

async function checkPagination(
  resPagination: BaseResult,
  context: EndpointAppContext,
  total: number,
  builtPageInfo: PaginationInfo
) {
  const pagination = await getPagination(context, builtPageInfo);
  expect(resPagination.total).toBe(total);

  expect(resPagination.result_from_index).toBe(pagination.from);
  expect(resPagination.request_page_index).toBe(pagination.page);
  expect(resPagination.request_page_size).toBe(pagination.pageSize);
}

describe('build resolver node and related event responses', () => {
  let mockScopedClient: jest.Mocked<IScopedClusterClient>;
  let endpointContext: EndpointAppContext;
  let total: number;
  let hits: ResolverDataHit[];
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
  describe('new format responses', () => {
    const entityID = '12345';
    const parentEntityID = '5555';

    describe('single node retrieval', () => {
      beforeEach(() => {
        ({ total, hits, origin } = buildResolverP1Hits(
          entityID,
          parentEntityID,
          // 0 nodes should be created because it's a request for only the specific node
          0,
          3
        ));
      });
      it('sets the response correctly for a node retrieval', async () => {
        const pageInfo = buildPageInfo(1, 50);
        const handler = new SingleNodeHandler(
          mockScopedClient,
          endpointContext,
          pageInfo,
          {},
          entityID
        );

        const res = await handler.buildResponse(hits, createTotal(total, true));
        expect(res.node.parent_entity_id).toBe(parentEntityID);
        expect(res.node.entity_id).toBe(entityID);
        expect(res.node.events).toStrictEqual(origin);
        await checkPagination(res, endpointContext, total, pageInfo);
      });
    });
    describe('multiple node retrieval', () => {
      beforeEach(() => {
        ({ total, hits, origin } = buildResolverP1Hits(entityID, parentEntityID, 3, 3));
      });
      it('sets the response correctly for a node retrieval', async () => {
        const pageInfo = buildPageInfo(1, 50);
        const handler = new ChildrenSearchHandler(
          mockScopedClient,
          endpointContext,
          pageInfo,
          {},
          entityID
        );

        const res = await handler.buildResponse(hits, createTotal(total, true));
        expect(res.origin.parent_entity_id).toBe(parentEntityID);
        expect(res.origin.entity_id).toBe(entityID);
        expect(res.origin.events).toStrictEqual(origin);
        // built 3 children nodes in before each call
        expect(res.children.length).toBe(3);
        for (const child of res.children) {
          // 3 events per child node
          expect(child.events.length).toBe(3);
          expect(child.parent_entity_id).toBe(entityID);
        }
        await checkPagination(res, endpointContext, total, pageInfo);
      });
    });
  });

  describe('legacy responses', () => {
    const originEntityID = 'endgame|12345|5';
    const { endpointID, uniquePID } = parseLegacyEntityID(originEntityID);
    const uniquePIDNum = Number(uniquePID);
    const parentUniquePID = 999;
    const originParentEntityID = buildLegacyEntityID(endpointID, parentUniquePID);
    describe('multiple node retrieval', () => {
      beforeEach(() => {
        ({ total, hits, origin } = buildResolverP0Hits(
          endpointID,
          uniquePIDNum,
          parentUniquePID,
          3,
          4
        ));
      });
      it('sets the response correctly for a node retrieval', async () => {
        const pageInfo = buildPageInfo(1, 50);
        const handler = new ChildrenSearchHandler(
          mockScopedClient,
          endpointContext,
          pageInfo,
          {},
          originEntityID
        );

        const res = await handler.buildResponse(hits, createTotal(total, true));
        expect(res.origin.parent_entity_id).toBe(originParentEntityID);
        expect(res.origin.entity_id).toBe(originEntityID);
        expect(res.origin.events).toStrictEqual(origin);
        // built 3 children nodes in before each call
        expect(res.children.length).toBe(3);
        for (const child of res.children) {
          // 4 events per child node
          expect(child.events.length).toBe(4);
          // the parent of the children should be the origin's entity id
          expect(child.parent_entity_id).toBe(originEntityID);
        }
        await checkPagination(res, endpointContext, total, pageInfo);
      });
    });
    describe('single node retrieval', () => {
      beforeEach(() => {
        ({ total, hits, origin } = buildResolverP0Hits(
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
        const handler = new SingleNodeHandler(
          mockScopedClient,
          endpointContext,
          pageInfo,
          {},
          originEntityID
        );

        const res = await handler.buildResponse(hits, createTotal(total, true));
        expect(res.node.parent_entity_id).toBe(originParentEntityID);
        expect(res.node.entity_id).toBe(originEntityID);
        expect(res.node.events).toStrictEqual(origin);
        await checkPagination(res, endpointContext, total, pageInfo);
      });

      it('uses defaults when pagination is not defined', async () => {
        const pageInfo = buildPageInfo();
        const handler = new SingleNodeHandler(
          mockScopedClient,
          endpointContext,
          pageInfo,
          {},
          originEntityID
        );

        const res = await handler.buildResponse(hits, createTotal(total, true));

        await checkPagination(res, endpointContext, total, pageInfo);
      });

      it('uses elasticsearch count call to find the total when track hits fails', async () => {
        const trueTotal = 100;
        buildCountResponse(trueTotal, mockScopedClient);
        const pageInfo = buildPageInfo();
        const handler = new SingleNodeHandler(
          mockScopedClient,
          endpointContext,
          pageInfo,
          {},
          originEntityID
        );
        const res = await handler.buildResponse(hits, createTotal(total, false));

        expect(res.total).toBe(trueTotal);
      });
    });
  });
});
