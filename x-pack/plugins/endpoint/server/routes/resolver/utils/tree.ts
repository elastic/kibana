/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { ResolverEvent } from '../../../../common/types';
import { extractEntityID, extractParentEntityID } from './normalize';
import { buildPaginationCursor } from './pagination';

interface NodeStats {
  totalEvents: number;
  totalAlerts: number;
}

interface Node {
  children: Node[];
  events: ResolverEvent[];
  alerts: ResolverEvent[];
  lifecycle: ResolverEvent[];
  parent?: Node | null;
  pagination: {
    nextChild?: string | null;
    nextEvent?: string | null;
    nextAncestor?: string | null;
    nextAlert?: string | null;
  };
  stats?: NodeStats;
}

type ExtractFunction = (event: ResolverEvent) => string;

function createNode(): Node {
  return { children: [], pagination: {}, events: [], alerts: [], lifecycle: [] };
}

// This class aids in constructing a tree of process events. It works in the following way:
//
// 1. We construct a tree structure starting with the root node for the event we're requesting.
// 2. We leverage the ability to pass hashes and arrays by reference to construct a fast cache of
//    process identifiers that updates the tree structure as we push values into the cache.
//
// When we query a single level of results for child process events we have a flattened, sorted result
// list that we need to add into a constructed tree. We also need to signal in an API response whether
// or not there are more child processes events that we have not yet retrieved, and, if so, for what parent
// process. So, at the end of our tree construction we have a relational layout of the events with no
// pagination information for the given parent nodes. In order to actually construct both the tree and
// insert the pagination information we basically do the following:
//
// 1. Using a terms aggregation query, we return an approximate roll-up of the number of child process
//    "creation" events, this gives us an estimation of the number of associated children per parent
// 2. We feed these child process creation event "unique identifiers" (basically a process.entity_id)
//    into a second query to get the current state of the process via its "lifecycle" events.
// 3. We construct the tree above with the "lifecycle" events.
// 4. Using the terms query results, we mark each non-leaf node with the number of expected children, if our
//    tree has less children than expected, we create a pagination cursor to indicate "we have a truncated set
//    of values".
// 5. We mark each leaf node (the last level of the tree we're constructing) with a "null" for the expected
//    number of children to indicate "we have not yet attempted to get any children".
//
// Following this scheme, we use exactly 2 queries per level of children that we return--one for the pagination
// and one for the lifecycle events of the processes. The downside to this is that we need to dynamically expand
// the number of documents we can retrieve per level due to the exponential fanout of child processes,
// what this means is that noisy neighbors for a given level may hide other child process events that occur later
// temporally in the same level--so, while a heavily forking process might get shown, maybe the actually malicious
// event doesn't show up in the tree at the beginning.
export class Tree {
  protected cache: Record<string, Node>;
  protected root: Node;
  protected id: string;

  constructor(id: string) {
    const root = createNode();
    this.id = id;
    this.cache = { [id]: root };
    this.root = root;
  }

  public render() {
    return this.root;
  }

  public ids() {
    return Object.keys(this.cache);
  }

  public static async merge(
    childrenPromise: Promise<Tree>,
    ancestorsPromise: Promise<Tree>,
    eventsPromise: Promise<Tree>,
    alertsPromise: Promise<Tree>
  ) {
    const [children, ancestors, events, alerts] = await Promise.all([
      childrenPromise,
      ancestorsPromise,
      eventsPromise,
      alertsPromise,
    ]);

    // we only allow for merging when we have partial trees that
    // represent the same root node
    const rootID = children.id;
    if (rootID !== ancestors.id || rootID !== events.id || rootID !== alerts.id) {
      throw new Error('cannot merge trees with different roots');
    }

    // our caches should be exclusive for everything but the root node so we can
    // just merge them
    Object.entries(ancestors.cache).forEach(([id, node]) => {
      if (rootID !== id) children.cache[id] = node;
    });

    // fix up the references
    children.root.lifecycle = ancestors.root.lifecycle; // lifecycle is bound to the ancestors query
    children.root.parent = ancestors.root.parent;
    children.root.events = events.root.events;
    children.root.alerts = alerts.root.alerts;

    // merge the pagination
    Object.assign(
      children.root.pagination,
      ancestors.root.pagination,
      events.root.pagination,
      alerts.root.pagination
    );

    return children;
  }

  public addEvent(...events: ResolverEvent[]) {
    events.forEach(event => {
      const id = extractEntityID(event);

      this.ensureCache(id);
      this.cache[id].events.push(event);
    });
  }

  public addAlert(...alerts: ResolverEvent[]) {
    alerts.forEach(alert => {
      const id = extractEntityID(alert);

      this.ensureCache(id);
      this.cache[id].alerts.push(alert);
    });
  }

  public addAncestor(id: string, ...events: ResolverEvent[]) {
    this.ensureCache(id);
    events.forEach(event => {
      const ancestorID = extractEntityID(event);

      if (!this.cache[ancestorID]) {
        this.cache[ancestorID] = createNode();
        this.cache[id].parent = this.cache[ancestorID];
      }
      this.cache[ancestorID].lifecycle.push(event);
    });
  }

  public addStats(id: string, stats: NodeStats) {
    this.ensureCache(id);
    this.cache[id].stats = stats;
  }

  public setNextAncestor(next: string | null) {
    this.root.pagination.nextAncestor = next;
  }

  public setNextEvent(next: string | null) {
    this.root.pagination.nextEvent = next;
  }

  public setNextAlert(next: string | null) {
    this.root.pagination.nextAlert = next;
  }

  public addChild(...events: ResolverEvent[]) {
    events.forEach(event => {
      const id = extractEntityID(event);
      const parent = extractParentEntityID(event);

      this.ensureCache(parent);

      if (!this.cache[id]) {
        // these should maintain the ordering that elasticsearch hands back
        this.cache[id] = createNode();
        this.cache[parent].children.push(this.cache[id]);
      }
      this.cache[id].lifecycle.push(event);
    });
  }

  public markLeafNode(...ids: string[]) {
    ids.forEach(id => {
      this.ensureCache(id);
      if (!this.cache[id].pagination.nextChild) {
        this.cache[id].pagination.nextChild = null;
      }
    });
  }

  public paginateEvents(totals: Record<string, number>, events: ResolverEvent[]) {
    return this.paginate(extractEntityID, 'nextEvent', totals, events);
  }

  public paginateAlerts(totals: Record<string, number>, events: ResolverEvent[]) {
    return this.paginate(extractEntityID, 'nextAlert', totals, events);
  }

  public paginateChildren(totals: Record<string, number>, children: ResolverEvent[]) {
    return this.paginate(extractParentEntityID, 'nextChild', totals, children);
  }

  private paginate(
    grouper: ExtractFunction,
    attribute: string,
    totals: Record<string, number>,
    records: ResolverEvent[]
  ) {
    const grouped = _.groupBy(records, grouper);
    Object.entries(totals).forEach(([id, total]) => {
      if (this.cache[id]) {
        if (grouped[id]) {
          // if we have any results, attempt to build a pagination cursor, the function
          // below hands back a null value if no cursor is necessary because we have
          // all of the records.
          (this.cache[id].pagination as any)[attribute] = buildPaginationCursor(total, grouped[id]);
        }
      }
    });
  }

  private ensureCache(id: string) {
    if (!this.cache[id]) {
      throw new Error('dangling node');
    }
  }
}
