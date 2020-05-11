/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'kibana/server';
import { AncestorEvents, RelatedEvents } from '../../../../common/types';
import { entityId, parentEntityId } from '../../../../common/models/event';
import { PaginationBuilder } from './pagination';
import { Tree } from './tree';
import { LifecycleQuery } from '../queries/lifecycle';
import { ChildrenQuery } from '../queries/children';
import { EventsQuery } from '../queries/events';
import { StatsQuery } from '../queries/stats';
import { createAncestorEvents, createRelatedEvents, createLifecycleEvents } from './node';

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
  public async ancestors(limit: number): Promise<AncestorEvents> {
    const root = createAncestorEvents();
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
  public async children(limit: number, generations: number, after?: string): Promise<Tree> {
    const tree = new Tree(this.id);
    await this.doChildren(tree, [this.id], limit, generations, after);
    return tree;
  }

  /**
   * Retrieves the related events for the origin node.
   *
   * @param limit the upper bound number of related events to return
   * @param after a cursor to use as the starting point for retrieving related events
   */
  public async events(limit: number, after?: string): Promise<RelatedEvents> {
    return await this.doEvents(limit, after);
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
    ancestorInfo: AncestorEvents
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
    ancestorInfo.ancestors.push(createLifecycleEvents(curNodeID, results));

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
    tree: Tree,
    ids: string[],
    limit: number,
    levels: number,
    after?: string
  ) {
    if (levels === 0 || ids.length === 0) return;

    const childrenQuery = new ChildrenQuery(
      PaginationBuilder.createBuilder(limit, after),
      this.indexPattern,
      this.endpointID
    );
    const lifecycleQuery = new LifecycleQuery(this.indexPattern, this.endpointID);

    const { totals, results } = await childrenQuery.search(this.client, ids);
    if (results.length === 0) {
      tree.markLeafNode(ids);
      return;
    }

    const childIDs = results.map(entityId);
    const children = await lifecycleQuery.search(this.client, childIDs);

    tree.addChild(children);
    tree.paginateChildren(totals, results);
    tree.markLeafNode(childIDs);

    await this.doChildren(tree, childIDs, limit * limit, levels - 1);
  }

  private async doStats(tree: Tree) {
    const statsQuery = new StatsQuery(this.indexPattern, this.endpointID);
    const ids = tree.ids();
    const res = await statsQuery.search(this.client, ids);
    const alerts = res?.alerts || {};
    const events = res?.events || {};
    ids.forEach(id => {
      tree.addStats(id, { totalAlerts: alerts[id] || 0, totalEvents: events[id] || 0 });
    });
  }
}
