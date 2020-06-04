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
} from '../../../../../common/endpoint/types';
import { entityId, parentEntityId } from '../../../../../common/endpoint/models/event';
import { PaginationBuilder } from './pagination';
import { Tree } from './tree';
import { LifecycleQuery } from '../queries/lifecycle';
import { ChildrenQuery } from '../queries/children';
import { EventsQuery } from '../queries/events';
import { StatsQuery } from '../queries/stats';
import { createAncestry, createRelatedEvents, createLifecycle } from './node';
import { ChildrenNodesHelper } from './children_helper';

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

  /**
   * Retrieves the ancestor nodes for the resolver tree.
   *
   * @param limit upper limit of ancestors to retrieve
   */
  public async ancestors(limit: number): Promise<ResolverAncestry> {
    const root = createAncestry();
    await this.doAncestors(this.id, limit + 1, root);
    return root;
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
   * Enriches a resolver tree with statistics for how many related events and alerts exist for each node in the tree.
   *
   * @param tree a resolver tree to enrich with statistical information.
   */
  public async stats(tree: Tree): Promise<Tree> {
    await this.doStats(tree);
    return tree;
  }

  private async doAncestors(
    curNodeID: string,
    levels: number,
    ancestorInfo: ResolverAncestry
  ): Promise<void> {
    if (levels === 0) {
      ancestorInfo.nextAncestor = curNodeID;
      return;
    }

    const query = new LifecycleQuery(this.indexPattern, this.endpointID);
    const results = await query.search(this.client, curNodeID);

    if (results.length === 0) {
      return;
    }
    ancestorInfo.ancestors.push(createLifecycle(curNodeID, results));

    const next = parentEntityId(results[0]);
    if (next === undefined) {
      return;
    }
    await this.doAncestors(next, levels - 1, ancestorInfo);
  }

  private async doEvents(limit: number, after?: string) {
    const query = new EventsQuery(
      PaginationBuilder.createBuilder(limit, after),
      this.indexPattern,
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

    await this.doChildren(cache, childIDs, limit, levels - 1);
  }

  private async doStats(tree: Tree) {
    const statsQuery = new StatsQuery(this.indexPattern, this.endpointID);
    const ids = tree.ids();
    const res = await statsQuery.search(this.client, ids);
    const alerts = res?.alerts || {};
    const events = res?.events || {};
    ids.forEach((id) => {
      tree.addStats(id, { totalAlerts: alerts[id] || 0, totalEvents: events[id] || 0 });
    });
  }
}
