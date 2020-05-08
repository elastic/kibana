/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'kibana/server';
import { ResolverEvent } from '../../../../common/types';
import { entityId, parentEntityId } from '../../../../common/models/event';
import { PaginationBuilder } from './pagination';
import { Tree } from './tree';
import { LifecycleQuery } from '../queries/lifecycle';
import { ChildrenQuery } from '../queries/children';
import { EventsQuery } from '../queries/events';
import { StatsQuery } from '../queries/stats';

// TODO move these to common types
export interface RelatedEvents {
  events: ResolverEvent[];
  nextEvent: string | null;
}

interface LifecycleEvents {
  lifecycle: ResolverEvent[];
}

export interface AncestorEvents {
  ancestors: LifecycleEvents[];
  nextAncestor: string | null;
}

export interface ChildrenNode {
  lifecycle: ResolverEvent[];
  children: ChildrenNode[];
  nextChild: string | null;
}

export class Fetcher {
  constructor(
    private readonly client: IScopedClusterClient,
    private readonly id: string,
    private readonly indexPattern: string,
    private readonly endpointID?: string
  ) {}

  public async ancestors(limit: number): Promise<AncestorEvents> {
    return await this.doAncestors(this.id, limit);
  }

  public async children(limit: number, generations: number, after?: string): Promise<Tree> {
    const tree = new Tree(this.id);
    await this.doChildren(tree, [this.id], limit, generations, after);
    return tree;
  }

  public async events(limit: number, after?: string): Promise<RelatedEvents> {
    return await this.doEvents(limit, after);
  }

  public async stats(tree: Tree): Promise<Tree> {
    await this.doStats(tree);
    return tree;
  }

  private async doAncestors(
    curNode: string,
    levels: number,
    ancestors: LifecycleEvents[] = []
  ): Promise<AncestorEvents> {
    if (levels === 0) {
      return { ancestors, nextAncestor: curNode };
    }

    const query = new LifecycleQuery(this.indexPattern, this.endpointID);
    const results = await query.search(this.client, curNode);

    if (results.length === 0) {
      return { ancestors, nextAncestor: null };
    }
    ancestors.push({ lifecycle: results });

    const next = parentEntityId(results[0]);
    if (next === undefined) {
      return { ancestors, nextAncestor: null };
    }
    return await this.doAncestors(next, levels - 1, ancestors);
  }

  private async doEvents(limit: number, after?: string) {
    const query = new EventsQuery(
      PaginationBuilder.createBuilder(limit, after),
      this.indexPattern,
      this.endpointID
    );

    const { totals, results } = await query.search(this.client, this.id);
    if (results.length === 0) {
      return { events: [], nextEvent: null };
    }
    if (!totals[this.id]) {
      throw new Error(`Could not find the totals for related events entity_id: ${this.id}`);
    }

    return { events: results, nextEvent: PaginationBuilder.buildCursor(totals[this.id], results) };
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
