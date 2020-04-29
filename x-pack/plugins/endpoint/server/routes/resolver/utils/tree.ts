/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import {
  ResolverEvent,
  ResolverNode,
  ResolverNodeStats,
  ResolverNodePagination,
} from '../../../../common/types';
import { entityId, parentEntityId } from '../../../../common/models/event';
import { buildPaginationCursor } from './pagination';

type ExtractFunction = (event: ResolverEvent) => string | undefined;

function createNode(id: string): ResolverNode {
  return { id, children: [], pagination: {}, events: [], lifecycle: [] };
}
/**
 * This class aids in constructing a tree of process events. It works in the following way:
 *
 * 1. We construct a tree structure starting with the root node for the event we're requesting.
 * 2. We leverage the ability to pass hashes and arrays by reference to construct a fast cache of
 *  process identifiers that updates the tree structure as we push values into the cache.
 *
 * When we query a single level of results for child process events we have a flattened, sorted result
 * list that we need to add into a constructed tree. We also need to signal in an API response whether
 * or not there are more child processes events that we have not yet retrieved, and, if so, for what parent
 * process. So, at the end of our tree construction we have a relational layout of the events with no
 * pagination information for the given parent nodes. In order to actually construct both the tree and
 * insert the pagination information we basically do the following:
 *
 * 1. Using a terms aggregation query, we return an approximate roll-up of the number of child process
 *  "creation" events, this gives us an estimation of the number of associated children per parent
 * 2. We feed these child process creation event "unique identifiers" (basically a process.entity_id)
 * into a second query to get the current state of the process via its "lifecycle" events.
 * 3. We construct the tree above with the "lifecycle" events.
 * 4. Using the terms query results, we mark each non-leaf node with the number of expected children, if our
 * tree has less children than expected, we create a pagination cursor to indicate "we have a truncated set
 * of values".
 * 5. We mark each leaf node (the last level of the tree we're constructing) with a "null" for the expected
 *   number of children to indicate "we have not yet attempted to get any children".
 *
 * Following this scheme, we use exactly 2 queries per level of children that we return--one for the pagination
 * and one for the lifecycle events of the processes. The downside to this is that we need to dynamically expand
 * the number of documents we can retrieve per level due to the exponential fanout of child processes,
 * what this means is that noisy neighbors for a given level may hide other child process events that occur later
 * temporally in the same level--so, while a heavily forking process might get shown, maybe the actually malicious
 * event doesn't show up in the tree at the beginning.
 */

export class Tree {
  protected cache: Map<string, ResolverNode>;
  protected root: ResolverNode;
  protected id: string;

  constructor(id: string) {
    const root = createNode(id);
    this.id = id;
    this.cache = new Map();
    this.root = root;
    this.cache.set(id, root);
  }

  public render(): ResolverNode {
    return this.root;
  }

  public ids(): string[] {
    return [...this.cache.keys()];
  }

  public static async merge(
    childrenPromise: Promise<Tree>,
    ancestorsPromise: Promise<Tree>,
    eventsPromise: Promise<Tree>
  ): Promise<Tree> {
    const [children, ancestors, events] = await Promise.all([
      childrenPromise,
      ancestorsPromise,
      eventsPromise,
    ]);

    /*
     * we only allow for merging when we have partial trees that
     * represent the same root node
     */
    const rootID = children.id;
    if (rootID !== ancestors.id || rootID !== events.id) {
      throw new Error('cannot merge trees with different roots');
    }

    Object.entries(ancestors.cache).forEach(([id, node]) => {
      if (rootID !== id) {
        children.cache.set(id, node);
      }
    });

    children.root.lifecycle = ancestors.root.lifecycle;
    children.root.ancestors = ancestors.root.ancestors;
    children.root.events = events.root.events;

    Object.assign(children.root.pagination, ancestors.root.pagination, events.root.pagination);

    return children;
  }

  public addEvent(...events: ResolverEvent[]): void {
    events.forEach(event => {
      const id = entityId(event);

      this.ensureCache(id);
      const currentNode = this.cache.get(id);
      if (currentNode !== undefined) {
        currentNode.events.push(event);
      }
    });
  }

  public addAncestor(id: string, ...events: ResolverEvent[]): void {
    events.forEach(event => {
      const ancestorID = entityId(event);
      if (this.cache.get(ancestorID) === undefined) {
        const newParent = createNode(ancestorID);
        this.cache.set(ancestorID, newParent);
        if (!this.root.ancestors) {
          this.root.ancestors = [];
        }
        this.root.ancestors.push(newParent);
      }
      const currentAncestor = this.cache.get(ancestorID);
      if (currentAncestor !== undefined) {
        currentAncestor.lifecycle.push(event);
      }
    });
  }

  public addStats(id: string, stats: ResolverNodeStats): void {
    this.ensureCache(id);
    const currentNode = this.cache.get(id);
    if (currentNode !== undefined) {
      currentNode.stats = stats;
    }
  }

  public setNextAncestor(next: string | null): void {
    this.root.pagination.nextAncestor = next;
  }

  public setNextEvent(next: string | null): void {
    this.root.pagination.nextEvent = next;
  }

  public setNextAlert(next: string | null): void {
    this.root.pagination.nextAlert = next;
  }

  public addChild(...events: ResolverEvent[]): void {
    events.forEach(event => {
      const id = entityId(event);
      const parentID = parentEntityId(event);

      this.ensureCache(parentID);
      let currentNode = this.cache.get(id);

      if (currentNode === undefined) {
        currentNode = createNode(id);
        this.cache.set(id, currentNode);
        if (parentID !== undefined) {
          const parentNode = this.cache.get(parentID);
          if (parentNode !== undefined) {
            parentNode.children.push(currentNode);
          }
        }
      }
      currentNode.lifecycle.push(event);
    });
  }

  public markLeafNode(...ids: string[]): void {
    ids.forEach(id => {
      this.ensureCache(id);
      const currentNode = this.cache.get(id);
      if (currentNode !== undefined && !currentNode.pagination.nextChild) {
        currentNode.pagination.nextChild = null;
      }
    });
  }

  public paginateEvents(totals: Record<string, number>, events: ResolverEvent[]): void {
    return this.paginate(entityId, 'nextEvent', totals, events);
  }

  public paginateChildren(totals: Record<string, number>, children: ResolverEvent[]): void {
    return this.paginate(parentEntityId, 'nextChild', totals, children);
  }

  private paginate(
    grouper: ExtractFunction,
    attribute: keyof ResolverNodePagination,
    totals: Record<string, number>,
    records: ResolverEvent[]
  ): void {
    const grouped = _.groupBy(records, grouper);
    Object.entries(totals).forEach(([id, total]) => {
      if (this.cache.get(id) !== undefined) {
        if (grouped[id]) {
          /*
           * if we have any results, attempt to build a pagination cursor, the function
           * below hands back a null value if no cursor is necessary because we have
           * all of the records.
           */
          const currentNode = this.cache.get(id);
          if (currentNode !== undefined) {
            currentNode.pagination[attribute] = buildPaginationCursor(total, grouped[id]);
          }
        }
      }
    });
  }

  private ensureCache(id: string | undefined): void {
    if (id === undefined || this.cache.get(id) === undefined) {
      throw new Error('dangling node');
    }
  }
}
