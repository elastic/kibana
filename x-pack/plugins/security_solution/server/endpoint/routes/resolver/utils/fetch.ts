/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'kibana/server';
import {
  ResolverChildren,
  ResolverRelatedEvents,
  ResolverAncestry,
  ResolverRelatedAlerts,
  LifecycleNode,
} from '../../../../../common/endpoint/types';
import { entityId, ancestryArray } from '../../../../../common/endpoint/models/event';
import { Tree } from './tree';
import { LifecycleQuery } from '../queries/lifecycle';
import { ChildrenQuery } from '../queries/children';
import { StatsQuery } from '../queries/stats';
import { createLifecycle, createChildren } from './node';
import { ChildrenNodesHelper } from './children_helper';
import { TotalsPaginationBuilder } from './totals_pagination';
import { MultiSearcher, QueryInfo } from '../queries/multi_searcher';
import { AncestryQueryHandler } from './ancestry_query_handler';
import { RelatedEventsQueryHandler } from './events_query_handler';
import { RelatedAlertsQueryHandler } from './alerts_query_handler';
import { ChildrenStartQueryHandler } from './children_start_query_handler';
import { LifecycleQueryHandler } from './children_lifecycle_query_handler';

export interface TreeOptions {
  children: number;
  ancestors: number;
  events: number;
  alerts: number;
  afterAlert?: string;
  afterEvent?: string;
  afterChild?: string;
}

interface QueryBuilder {
  nextQuery(): QueryInfo | undefined;
}

export interface SingleQueryHandler<T> extends QueryBuilder {
  getResults(): T | undefined;
  search(client: IScopedClusterClient): Promise<T>;
}

export interface QueryHandler<T> extends SingleQueryHandler<T> {
  hasMore(): boolean;
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
      this.doAncestors(options.ancestors, originNode),
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
    const addQueryToList = (queryHandler: QueryBuilder, queries: QueryInfo[]) => {
      const queryInfo = queryHandler.nextQuery();
      if (queryInfo !== undefined) {
        queries.push(queryInfo);
      }
    };

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

    const alertsHandler = new RelatedAlertsQueryHandler(
      options.alerts,
      this.id,
      options.afterAlert,
      this.indexPattern,
      this.endpointID
    );

    const childrenHandler = new ChildrenStartQueryHandler(
      options.children,
      this.id,
      options.afterChild,
      this.indexPattern,
      this.endpointID
    );

    const msearch = new MultiSearcher(this.client);

    let queries: QueryInfo[] = [];
    addQueryToList(eventsHandler, queries);
    addQueryToList(alertsHandler, queries);
    addQueryToList(childrenHandler, queries);

    if (ancestryHandler.hasMore()) {
      addQueryToList(ancestryHandler, queries);
    }
    await msearch.search(queries);

    while (ancestryHandler.hasMore() || childrenHandler.hasMore()) {
      queries = [];
      addQueryToList(ancestryHandler, queries);
      addQueryToList(childrenHandler, queries);
      await msearch.search(queries);
    }

    const childrenTotalsHelper = childrenHandler.getResults();

    const childrenLifecycleHandler = new LifecycleQueryHandler(
      childrenTotalsHelper,
      this.indexPattern,
      this.endpointID
    );

    childrenLifecycleHandler.search(this.client);

    const tree = new Tree(this.id, {
      ancestry: ancestryHandler.getResults(),
      relatedEvents: eventsHandler.getResults(),
      relatedAlerts: alertsHandler.getResults(),
      children: childrenLifecycleHandler.getResults(),
    });

    return this.stats(tree);
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
    return ancestryHandler.search(this.client);
  }

  /**
   * Retrieves the children nodes for the resolver tree.
   *
   * @param limit the number of children to retrieve for a single level
   * @param after a cursor to use as the starting point for retrieving children
   */
  public async children(limit: number, after?: string): Promise<ResolverChildren> {
    const originNode = await this.getNode(this.id);
    if (!originNode) {
      return createChildren();
    }

    if (!ancestryArray(originNode.lifecycle[0])) {
      const helper = await this.findChildrenWithoutAncestry(this.id, limit, after);

      return helper.getNodes();
    }

    const childrenHandler = new ChildrenStartQueryHandler(
      limit,
      this.id,
      after,
      this.indexPattern,
      this.endpointID
    );
    const helper = await childrenHandler.search(this.client);
    const childrenLifecycleHandler = new LifecycleQueryHandler(
      helper,
      this.indexPattern,
      this.endpointID
    );

    return childrenLifecycleHandler.search(this.client);
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

    return eventsHandler.search(this.client);
  }

  /**
   * Retrieves the alerts for the origin node.
   *
   * @param limit the upper bound number of alerts to return
   * @param after a cursor to use as the starting point for retrieving alerts
   */
  public async alerts(limit: number, after?: string): Promise<ResolverRelatedAlerts> {
    const alertsHandler = new RelatedAlertsQueryHandler(
      limit,
      this.id,
      after,
      this.indexPattern,
      this.endpointID
    );

    return alertsHandler.search(this.client);
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

  private async findChildrenWithoutAncestry(id: string, limit: number, after?: string) {
    let nodesLeft = limit;
    let childIDs = [id];
    let childrenQuery = new ChildrenQuery(
      TotalsPaginationBuilder.createBuilder(nodesLeft, after),
      this.indexPattern,
      this.endpointID
    );
    const cache = new ChildrenNodesHelper(id);

    while (childIDs.length > 0) {
      const { totals, results } = await childrenQuery.search(this.client, childIDs);
      if (results.length === 0) {
        break;
      }
      childIDs = results.map(entityId);

      cache.addPagination(totals, results);
      nodesLeft = limit - cache.getNumNodes();
      childrenQuery = new ChildrenQuery(
        TotalsPaginationBuilder.createBuilder(nodesLeft),
        this.indexPattern,
        this.endpointID
      );
    }
    const lifecycleQuery = new LifecycleQuery(this.indexPattern, this.endpointID);
    const children = await lifecycleQuery.search(this.client, cache.getEntityIDs());
    cache.addLifecycleEvents(children);
    return cache;
  }

  private async doAncestors(limit: number, originNode: LifecycleNode) {
    const ancestryHandler = new AncestryQueryHandler(
      limit,
      this.indexPattern,
      this.endpointID,
      originNode
    );
    return ancestryHandler.search(this.client);
  }

  // TODO have this take an array of entity ids and have the tree accept the format this function returns so the tree
  // doesn't have to be instantiated before calling this function
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
