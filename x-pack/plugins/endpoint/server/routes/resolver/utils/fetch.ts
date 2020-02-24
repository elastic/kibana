/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'kibana/server';
import { extractEntityID, extractParentEntityID } from './normalize';
import { getPaginationParams } from './pagination';
import { Tree } from './tree';
import { LifecycleQuery } from '../queries/lifecycle';
import { ChildrenQuery } from '../queries/children';
import { EventsQuery } from '../queries/events';
import { StatsQuery } from '../queries/stats';

export class Fetcher {
  constructor(
    private readonly client: IScopedClusterClient,
    private readonly id: string,
    private readonly endpointID?: string
  ) {}

  public async ancestors(limit: number): Promise<Tree> {
    const tree = new Tree(this.id);
    await this.doAncestors(tree, this.id, this.id, limit);
    return tree;
  }

  public async children(limit: number, generations: number, after?: string): Promise<Tree> {
    const tree = new Tree(this.id);
    await this.doChildren(tree, [this.id], limit, generations, after);
    return tree;
  }

  public async events(limit: number, after?: string): Promise<Tree> {
    const tree = new Tree(this.id);
    await this.doEvents(tree, limit, after);
    return tree;
  }

  public async alerts(limit: number, after?: string): Promise<Tree> {
    const tree = new Tree(this.id);
    await this.doAlerts(tree, limit, after);
    return tree;
  }

  public async stats(tree: Tree): Promise<Tree> {
    await this.doStats(tree);
    return tree;
  }

  private async doAncestors(tree: Tree, node: string, id: string, levels: number) {
    if (levels === 0) {
      tree.setNextAncestor(id);
      return;
    }

    const query = new LifecycleQuery(this.endpointID);
    const { results } = await query.search(this.client, id);

    if (results.length === 0) {
      tree.setNextAncestor(null);
      return;
    }

    tree.addAncestor(node, ...results);

    const next = extractParentEntityID(results[0]);
    await this.doAncestors(tree, id, next, levels - 1);
  }

  private async doAlerts(tree: Tree, limit: number, after?: string) {
    // uncomment this when we implement `AlertsQuery`
    //
    // const query = new AlertsQuery(this.endpointID, getPaginationParams(limit, after));
    // const { totals, results } = await query.search(this.client, this.id);
    // tree.addAlert(...results);
    // tree.paginateAlerts(totals, results);
    // if (results.length === 0) tree.setNextAlert(null);
  }

  private async doEvents(tree: Tree, limit: number, after?: string) {
    const query = new EventsQuery(this.endpointID, getPaginationParams(limit, after));

    const { totals, results } = await query.search(this.client, this.id);
    tree.addEvent(...results);
    tree.paginateEvents(totals, results);
    if (results.length === 0) tree.setNextEvent(null);
  }

  private async doChildren(
    tree: Tree,
    ids: string[],
    limit: number,
    levels: number,
    after?: string
  ) {
    if (levels === 0 || ids.length === 0) return;

    const childrenQuery = new ChildrenQuery(this.endpointID, getPaginationParams(limit, after));
    const lifecycleQuery = new LifecycleQuery(this.endpointID);

    const { totals, results } = await childrenQuery.search(this.client, ...ids);
    if (results.length === 0) {
      tree.markLeafNode(...ids);
      return;
    }

    const childIDs = results.map(extractEntityID);
    const children = (await lifecycleQuery.search(this.client, ...childIDs)).results;

    tree.addChild(...children);
    tree.paginateChildren(totals, results);
    tree.markLeafNode(...childIDs);

    await this.doChildren(tree, childIDs, limit * limit, levels - 1);
  }

  private async doStats(tree: Tree) {
    const statsQuery = new StatsQuery(this.endpointID);
    const ids = tree.ids();
    const { extras } = await statsQuery.search(this.client, ...ids);
    const alerts = extras?.alerts || {};
    const events = extras?.events || {};
    ids.forEach(id => {
      tree.addStats(id, { totalAlerts: alerts[id] || 0, totalEvents: events[id] || 0 });
    });
  }
}
