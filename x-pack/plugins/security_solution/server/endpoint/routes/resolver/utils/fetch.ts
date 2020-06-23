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
import { createAncestry, createRelatedEvents, createLifecycle, createRelatedAlerts } from './node';
import { ChildrenNodesHelper } from './children_helper';
import { AlertsQuery } from '../queries/alerts';

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
   * Retrieves the ancestor nodes for the resolver tree.
   *
   * @param limit upper limit of ancestors to retrieve
   */
  public async ancestors(limit: number): Promise<ResolverAncestry> {
    const ancestryInfo = createAncestry();
    const originNode = await this.getNode(this.id);
    if (originNode) {
      ancestryInfo.ancestors.push(originNode);
      // If the request is only for the origin node then set next to its parent
      ancestryInfo.nextAncestor = parentEntityId(originNode.lifecycle[0]) || null;
      await this.doAncestors(
        // limit the ancestors we're looking for to the number of levels
        // the array could be up to length 20 but that could change
        Fetcher.getAncestryAsArray(originNode.lifecycle[0]).slice(0, limit),
        limit,
        ancestryInfo
      );
    }
    return ancestryInfo;
  }

  /**
   * Retrieves the children nodes for the resolver tree.
   *
   * @param limit the number of children to retrieve for a single level
   * @param generations number of levels to return
   * @param after a cursor to use as the starting point for retrieving children
   */
  public async children(
    limit: number,
    generations: number,
    after?: string
  ): Promise<ResolverChildren> {
    const helper = new ChildrenNodesHelper(this.id);

    await this.doChildren(helper, [this.id], limit, generations, after);

    return helper.getNodes();
  }

  /**
   * Retrieves the related events for the origin node.
   *
   * @param limit the upper bound number of related events to return
   * @param after a cursor to use as the starting point for retrieving related events
   */
  public async events(limit: number, after?: string): Promise<ResolverRelatedEvents> {
    return this.doEvents(limit, after);
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
      this.alertsIndexPattern,
      this.endpointID
    );

    const { totals, results } = await query.search(this.client, this.id);
    if (results.length === 0) {
      // return an empty set of results
      return createRelatedAlerts(this.id);
    }
    if (!totals[this.id]) {
      throw new Error(`Could not find the totals for related events entity_id: ${this.id}`);
    }

    return createRelatedAlerts(
      this.id,
      results,
      PaginationBuilder.buildCursor(totals[this.id], results)
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
    const query = new LifecycleQuery(this.eventsIndexPattern, this.endpointID);
    const results = await query.search(this.client, entityID);
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

  private async doAncestors(
    ancestors: string[],
    levels: number,
    ancestorInfo: ResolverAncestry
  ): Promise<void> {
    if (levels <= 0) {
      return;
    }

    const query = new LifecycleQuery(this.eventsIndexPattern, this.endpointID);
    const results = await query.search(this.client, ancestors);

    if (results.length === 0) {
      ancestorInfo.nextAncestor = null;
      return;
    }

    // bucket the start and end events together for a single node
    const ancestryNodes = results.reduce(
      (nodes: Map<string, LifecycleNode>, ancestorEvent: ResolverEvent) => {
        const nodeId = entityId(ancestorEvent);
        let node = nodes.get(nodeId);
        if (!node) {
          node = createLifecycle(nodeId, []);
        }

        node.lifecycle.push(ancestorEvent);
        return nodes.set(nodeId, node);
      },
      new Map()
    );

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
      this.eventsIndexPattern,
      this.endpointID
    );

    const { totals, results } = await query.search(this.client, this.id);
    if (results.length === 0) {
      // return an empty set of results
      return createRelatedEvents(this.id);
    }
    if (!totals[this.id]) {
      throw new Error(`Could not find the totals for related events entity_id: ${this.id}`);
    }

    return createRelatedEvents(
      this.id,
      results,
      PaginationBuilder.buildCursor(totals[this.id], results)
    );
  }

  private async doChildren(
    cache: ChildrenNodesHelper,
    ids: string[],
    limit: number,
    levels: number,
    after?: string
  ) {
    if (levels === 0 || ids.length === 0) {
      return;
    }

    const childrenQuery = new ChildrenQuery(
      PaginationBuilder.createBuilder(limit, after),
      this.eventsIndexPattern,
      this.endpointID
    );
    const lifecycleQuery = new LifecycleQuery(this.eventsIndexPattern, this.endpointID);

    const { totals, results } = await childrenQuery.search(this.client, ids);
    if (results.length === 0) {
      return;
    }

    const childIDs = results.map(entityId);
    const children = await lifecycleQuery.search(this.client, childIDs);

    cache.addChildren(totals, children);

    await this.doChildren(cache, childIDs, limit, levels - 1);
  }

  private async doStats(tree: Tree) {
    const statsQuery = new StatsQuery(
      [this.eventsIndexPattern, this.alertsIndexPattern],
      this.endpointID
    );
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
