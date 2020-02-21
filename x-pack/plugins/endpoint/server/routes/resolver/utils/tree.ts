/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { ResolverEvent } from '../../../../common/types';
import { extractEntityID, extractParentEntityID } from './normalize';
import { buildPaginationCursor } from './pagination';

interface Node {
  children: Node[];
  pagination: {
    total: number | null;
    next: string | null;
    limit?: number;
  };
  lifecycle: ResolverEvent[];
}

function createNode(): Node {
  return { children: [], pagination: { total: 0, next: null }, lifecycle: [] };
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
  private cache: Record<string, Node>;
  private root: Node;

  constructor(id: string, limit: number) {
    const root = createNode();
    root.pagination.limit = limit;
    this.cache = { [id]: { children: root.children, lifecycle: [], pagination: root.pagination } };
    this.root = root;
  }

  public addChild(event: ResolverEvent, lastLevel: boolean) {
    const id = extractEntityID(event);
    const parent = extractParentEntityID(event);

    if (!this.cache[parent]) {
      // We need to add the node we're creating to the tree immediately
      // otherwise we wind up with a dangling reference and we'll have
      // inaccessible nodes in the cache. Since the parent node doesn't
      // exist in this case, it means we actually can't add it into the
      // proper location in the tree, so bomb out rather than leaving dangling
      // references.
      //
      // This should never get hit if we paginate properly and traverse each level
      // of results one at a time.
      throw new Error('dangling node');
    }
    if (!this.cache[id]) {
      // these should maintain the ordering that elasticsearch hands back
      this.cache[id] = createNode();
      if (lastLevel) {
        // null out the pagination total since we know we haven't requested children yet
        // the logic should basically be, we have more results to query when either
        // total is null or total > the number of children we return
        this.cache[id].pagination.total = null;
      }
      this.cache[parent].children.push(this.cache[id]);
    }
    this.cache[id].lifecycle.push(event);
  }

  public addPagination(totals: Record<string, number>, sorted: ResolverEvent[]) {
    const grouped = _.groupBy(sorted, extractParentEntityID);
    Object.entries(totals).forEach(([id, total]) => {
      if (this.cache[id]) {
        this.cache[id].pagination.total = total;
        if (grouped[id]) {
          // if we have any results, attempt to build a pagination cursor, the function
          // below hands back a null value if no cursor is necessary because we have
          // all of the children.
          this.cache[id].pagination.next = buildPaginationCursor(total, grouped[id]);
        }
      }
    });
  }

  public dump() {
    return this.root;
  }
}
