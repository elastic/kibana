/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILegacyScopedClusterClient } from 'kibana/server';
import {
  ResolverChildren,
  ResolverRelatedEvents,
  ResolverAncestry,
  ResolverRelatedAlerts,
  ResolverLifecycleNode,
} from '../../../../../common/endpoint/types';
import { Tree } from './tree';
import { LifecycleQuery } from '../queries/lifecycle';
import { StatsQuery } from '../queries/stats';
import { createLifecycle } from './node';
import { MultiSearcher, QueryInfo } from '../queries/multi_searcher';
import { AncestryQueryHandler } from './ancestry_query_handler';
import { RelatedEventsQueryHandler } from './events_query_handler';
import { RelatedAlertsQueryHandler } from './alerts_query_handler';
import { ChildrenStartQueryHandler } from './children_start_query_handler';
import { ChildrenLifecycleQueryHandler } from './children_lifecycle_query_handler';
import { LifecycleQueryHandler } from './lifecycle_query_handler';

/**
 * The query parameters passed in from the request. These define the limits for the ES requests for retrieving the
 * resolver tree.
 */
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

/**
 * This interface defines the contract for a query handler that will only be used once in an msearch call.
 */
export interface SingleQueryHandler<T> extends QueryBuilder {
  /**
   * This method returns the results if the query has been used in an msearch call or undefined if not.
   */
  getResults(): T | undefined;
  /**
   * Do a regular search instead of msearch.
   * @param client the elasticsearch client
   */
  search(client: ILegacyScopedClusterClient): Promise<T>;
}

/**
 * This interface defines the contract for a query handler that can be used multiple times by msearch.
 */
export interface QueryHandler<T> extends SingleQueryHandler<T> {
  /**
   * Returns whether additional msearch are required to retrieve the rest of the expected data from ES.
   */
  hasMore(): boolean;
}

/**
 * Handles retrieving nodes of a resolver tree.
 */
export class Fetcher {
  constructor(
    private readonly client: ILegacyScopedClusterClient,
    /**
     * The anchoring origin for the tree.
     */
    private readonly id: string,
    /**
     * Index pattern for searching ES for events
     */
    private readonly eventsIndexPattern: string,
    /**
     * Index pattern for searching ES for alerts
     */
    private readonly alertsIndexPattern: string,
    /**
     * This is used for searching legacy events
     */
    private readonly endpointID?: string
  ) {}

  /**
   * This method retrieves the resolver tree starting from the `id` during construction of the class.
   *
   * @param options the options for retrieving the structure of the tree.
   */
  public async tree(options: TreeOptions) {
    const addQueryToList = (queryHandler: QueryBuilder, queries: QueryInfo[]) => {
      const queryInfo = queryHandler.nextQuery();
      if (queryInfo !== undefined) {
        queries.push(queryInfo);
      }
    };

    const originHandler = new LifecycleQueryHandler(
      this.id,
      this.eventsIndexPattern,
      this.endpointID
    );

    const eventsHandler = new RelatedEventsQueryHandler(
      options.events,
      this.id,
      options.afterEvent,
      this.eventsIndexPattern,
      this.endpointID
    );

    const alertsHandler = new RelatedAlertsQueryHandler(
      options.alerts,
      this.id,
      options.afterAlert,
      this.alertsIndexPattern,
      this.endpointID
    );

    // we need to get the start events first because the API request defines how many nodes to return and we don't want
    // to count or limit ourselves based on the other lifecycle events (end, etc)
    const childrenHandler = new ChildrenStartQueryHandler(
      options.children,
      this.id,
      options.afterChild,
      this.eventsIndexPattern,
      this.endpointID
    );

    const msearch = new MultiSearcher(this.client);

    let queries: QueryInfo[] = [];
    addQueryToList(eventsHandler, queries);
    addQueryToList(alertsHandler, queries);
    addQueryToList(childrenHandler, queries);
    addQueryToList(originHandler, queries);

    // get the related events, related alerts, the first pass of children start events, and the origin node
    // the origin node is needed so we can get the ancestry array for the additional ancestor calls
    await msearch.search(queries);

    const ancestryHandler = new AncestryQueryHandler(
      options.ancestors,
      this.eventsIndexPattern,
      this.endpointID,
      originHandler.getResults()
    );

    // get the remaining ancestors and children start events
    while (ancestryHandler.hasMore() || childrenHandler.hasMore()) {
      queries = [];
      addQueryToList(ancestryHandler, queries);
      addQueryToList(childrenHandler, queries);
      await msearch.search(queries);
    }

    const childrenTotalsHelper = childrenHandler.getResults();

    const childrenLifecycleHandler = new ChildrenLifecycleQueryHandler(
      childrenTotalsHelper,
      this.eventsIndexPattern,
      this.endpointID
    );

    // now that we have all the start events get the full lifecycle nodes
    childrenLifecycleHandler.search(this.client);

    const tree = new Tree(this.id, {
      ancestry: ancestryHandler.getResults(),
      relatedEvents: eventsHandler.getResults(),
      relatedAlerts: alertsHandler.getResults(),
      children: childrenLifecycleHandler.getResults(),
    });

    // add the stats to the tree
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
      this.eventsIndexPattern,
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
    const childrenHandler = new ChildrenStartQueryHandler(
      limit,
      this.id,
      after,
      this.eventsIndexPattern,
      this.endpointID
    );
    const helper = await childrenHandler.search(this.client);
    const childrenLifecycleHandler = new ChildrenLifecycleQueryHandler(
      helper,
      this.eventsIndexPattern,
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
      this.eventsIndexPattern,
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
      this.alertsIndexPattern,
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

  private async getNode(entityID: string): Promise<ResolverLifecycleNode | undefined> {
    const query = new LifecycleQuery(this.eventsIndexPattern, this.endpointID);
    const results = await query.searchAndFormat(this.client, entityID);
    if (results.length === 0) {
      return;
    }

    return createLifecycle(entityID, results);
  }

  private async doStats(tree: Tree) {
    const statsQuery = new StatsQuery(
      [this.eventsIndexPattern, this.alertsIndexPattern],
      this.endpointID
    );
    const ids = tree.ids();
    const res = await statsQuery.searchAndFormat(this.client, ids);
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
