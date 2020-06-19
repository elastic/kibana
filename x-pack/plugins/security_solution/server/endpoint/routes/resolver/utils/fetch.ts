/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import {
  ResolverChildren,
  ResolverRelatedEvents,
  ResolverAncestry,
  ResolverRelatedAlerts,
  LifecycleNode,
  ResolverEvent,
} from '../../../../../common/endpoint/types';
import {
  entityId,
  ancestryArray,
  parentEntityId,
} from '../../../../../common/endpoint/models/event';
import { PaginationBuilder } from './pagination';
import { Tree } from './tree';
import { LifecycleQuery } from '../queries/lifecycle';
import { ChildrenQuery } from '../queries/children';
import { EventsQuery } from '../queries/events';
import { StatsQuery } from '../queries/stats';
import { createRelatedEvents, createLifecycle, createRelatedAlerts } from './node';
import { AlertsQuery } from '../queries/alerts';
import { ChildrenNodesHelper } from './children_helper';
import { TotalsPaginationBuilder } from './totals_pagination';
import { MultiSearcher, QueryInfo } from '../queries/multi_searcher';
import { AncestryQueryHandler } from './ancestry_query_handler';
import { RelatedEventsQueryHandler } from './events_query_handler';

export interface TreeOptions {
  children: number;
  ancestors: number;
  events: number;
  alerts: number;
  afterAlert?: string;
  afterEvent?: string;
  afterChild?: string;
}

export interface QueryHandler<T> {
  buildQuery(): QueryInfo | undefined;
  handleResponse(searchResponse: SearchResponse<ResolverEvent>): void;
  getResults(): T | undefined;
  doSearch(client: IScopedClusterClient): Promise<T>;
}

/**
 * Handles retrieving nodes of a resolver tree.
 */
export class Fetcher {
  constructor(
    private readonly client: IScopedClusterClient,
    /**
     * The anchoring origin for the tree.
     */
    private readonly id: string,
    /**
     * Index pattern for searching ES
     */
    private readonly indexPattern: string,
    /**
     * This is used for searching legacy events
     */
    private readonly endpointID?: string
  ) {}

  public async tree(options: TreeOptions) {
    const originNode = await this.getNode(this.id);
    if (!originNode) {
      // empty tree
      return new Tree(this.id);
    }
    const hasAncestryArray = ancestryArray(originNode.lifecycle[0]);

    if (!hasAncestryArray) {
      return this.searchWithoutAncestryArray(options, originNode);
    } else {
      return this.searchWithAncestryArray(options, originNode);
    }
  }

  private async searchWithoutAncestryArray(options: TreeOptions, originNode: LifecycleNode) {
    const [childrenNodes, ancestry, relatedEvents, relatedAlerts] = await Promise.all([
      this.children(options.children, options.afterChild),
      this.doStuff(options.ancestors, originNode),
      this.events(options.events, options.afterEvent),
      this.alerts(options.alerts, options.afterAlert),
    ]);

    const tree = new Tree(this.id, {
      ancestry,
      children: childrenNodes,
      relatedEvents,
      relatedAlerts,
    });

    return this.stats(tree);
  }

  private async searchWithAncestryArray(options: TreeOptions, originNode: LifecycleNode) {
    const ancestryHandler = new AncestryQueryHandler(
      options.ancestors,
      this.indexPattern,
      this.endpointID,
      originNode
    );

    const eventsHandler = new RelatedEventsQueryHandler(
      options.events,
      this.id,
      options.afterEvent,
      this.indexPattern,
      this.endpointID
    );

    const msearch = new MultiSearcher(this.client);

    while (true) {
      const queries: QueryInfo[] = [];
      const ancestryQuery = ancestryHandler.buildQuery();
      if (ancestryQuery) {
        queries.push(ancestryQuery);
      }

      const eventsQuery = eventsHandler.buildQuery();
      if (eventsQuery) {
        queries.push(eventsQuery);
      }

      if (queries.length === 0) {
        break;
      }

      await msearch.search(queries);
    }

    return new Tree(this.id, {
      ancestry: ancestryHandler.getResults(),
      relatedEvents: eventsHandler.getResults(),
    });
  }

  // TODO rename
  private async doStuff(limit: number, originNode: LifecycleNode) {
    const ancestryHandler = new AncestryQueryHandler(
      limit,
      this.indexPattern,
      this.endpointID,
      originNode
    );
    return ancestryHandler.doSearch(this.client);
  }

  /**
   * Retrieves the ancestor nodes for the resolver tree.
   *
   * @param limit upper limit of ancestors to retrieve
   */
  public async ancestors(limit: number): Promise<ResolverAncestry> {
    const originNode = await this.getNode(this.id);
    const ancestryHandler = new AncestryQueryHandler(
      limit,
      this.indexPattern,
      this.endpointID,
      originNode
    );
    return ancestryHandler.doSearch(this.client);
  }

  /**
   * Retrieves the children nodes for the resolver tree.
   *
   * @param limit the number of children to retrieve for a single level
   * @param after a cursor to use as the starting point for retrieving children
   */
  public async children(limit: number, after?: string): Promise<ResolverChildren> {
    const helper = new ChildrenNodesHelper(this.id);

    await this.doChildren(helper, [this.id], limit, after);

    return helper.getNodes();
  }

  /**
   * Retrieves the related events for the origin node.
   *
   * @param limit the upper bound number of related events to return
   * @param after a cursor to use as the starting point for retrieving related events
   */
  public async events(limit: number, after?: string): Promise<ResolverRelatedEvents> {
    const eventsHandler = new RelatedEventsQueryHandler(
      limit,
      this.id,
      after,
      this.indexPattern,
      this.endpointID
    );

    return eventsHandler.doSearch(this.client);
  }

  /**
   * Retrieves the alerts for the origin node.
   *
   * @param limit the upper bound number of alerts to return
   * @param after a cursor to use as the starting point for retrieving alerts
   */
  public async alerts(limit: number, after?: string): Promise<ResolverRelatedAlerts> {
    const query = new AlertsQuery(
      PaginationBuilder.createBuilder(limit, after),
      this.indexPattern,
      this.endpointID
    );

    const results = await query.search(this.client, this.id);
    if (results.length === 0) {
      // return an empty set of results
      return createRelatedAlerts(this.id);
    }

    return createRelatedAlerts(
      this.id,
      results,
      PaginationBuilder.buildCursorRequestLimit(limit, results)
    );
  }

  /**
   * Enriches a resolver tree with statistics for how many related events and alerts exist for each node in the tree.
   *
   * @param tree a resolver tree to enrich with statistical information.
   */
  public async stats(tree: Tree): Promise<Tree> {
    await this.doStats(tree);
    return tree;
  }

  private async getNode(entityID: string): Promise<LifecycleNode | undefined> {
    const query = new LifecycleQuery(this.indexPattern, this.endpointID);
    const results = await query.searchAndFormat(this.client, entityID);
    if (results.length === 0) {
      return;
    }

    return createLifecycle(entityID, results);
  }

  private static getAncestryAsArray(event: ResolverEvent): string[] {
    const ancestors = ancestryArray(event);
    if (ancestors) {
      return ancestors;
    }

    const parentID = parentEntityId(event);
    if (parentID) {
      return [parentID];
    }

    return [];
  }

  private toMapOfNodes(results: ResolverEvent[]) {
    return results.reduce((nodes: Map<string, LifecycleNode>, event: ResolverEvent) => {
      const nodeId = entityId(event);
      let node = nodes.get(nodeId);
      if (!node) {
        node = createLifecycle(nodeId, []);
      }

      node.lifecycle.push(event);
      return nodes.set(nodeId, node);
    }, new Map());
  }

  private async doAncestors(
    ancestors: string[],
    levels: number,
    ancestorInfo: ResolverAncestry
  ): Promise<void> {
    if (levels <= 0) {
      return;
    }

    const query = new LifecycleQuery(this.indexPattern, this.endpointID);
    const results = await query.search(this.client, ancestors);

    if (results.length === 0) {
      ancestorInfo.nextAncestor = null;
      return;
    }

    // bucket the start and end events together for a single node
    const ancestryNodes = this.toMapOfNodes(results);

    // the order of this array is going to be weird, it will look like this
    // [furthest grandparent...closer grandparent, next recursive call furthest grandparent...closer grandparent]
    ancestorInfo.ancestors.push(...ancestryNodes.values());
    ancestorInfo.nextAncestor = parentEntityId(results[0]) || null;
    const levelsLeft = levels - ancestryNodes.size;
    // the results come back in ascending order on timestamp so the first entry in the
    // results should be the further ancestor (most distant grandparent)
    const next = Fetcher.getAncestryAsArray(results[0]).slice(0, levelsLeft);
    // the ancestry array currently only holds up to 20 values but we can't rely on that so keep recursing
    await this.doAncestors(next, levelsLeft, ancestorInfo);
  }

  private async doEvents(limit: number, after?: string) {
    const query = new EventsQuery(
      PaginationBuilder.createBuilder(limit, after),
      this.indexPattern,
      this.endpointID
    );

    const results = await query.search(this.client, this.id);
    if (results.length === 0) {
      // return an empty set of results
      return createRelatedEvents(this.id);
    }

    return createRelatedEvents(
      this.id,
      results,
      PaginationBuilder.buildCursorRequestLimit(limit, results)
    );
  }

  private async doChildren(
    cache: ChildrenNodesHelper,
    ids: string[],
    limit: number,
    after?: string
  ) {
    if (ids.length === 0) {
      return;
    }

    const childrenQuery = new ChildrenQuery(
      TotalsPaginationBuilder.createBuilder(limit, after),
      this.indexPattern,
      this.endpointID
    );
    const lifecycleQuery = new LifecycleQuery(this.indexPattern, this.endpointID);

    const { totals, results } = await childrenQuery.search(this.client, ids);
    if (results.length === 0) {
      return;
    }

    const childIDs = results.map(entityId);
    const children = await lifecycleQuery.search(this.client, childIDs);

    cache.addChildren(totals, children);
    const nodesLeft = limit - childIDs.length;

    await this.doChildren(cache, childIDs, nodesLeft);
  }

  private async doStats(tree: Tree) {
    const statsQuery = new StatsQuery(this.indexPattern, this.endpointID);
    const ids = tree.ids();
    const res = await statsQuery.search(this.client, ids);
    const alerts = res.alerts;
    const events = res.events;
    ids.forEach((id) => {
      tree.addStats(id, {
        totalAlerts: alerts[id] || 0,
        events: events[id] || { total: 0, byCategory: {} },
      });
    });
  }
}
