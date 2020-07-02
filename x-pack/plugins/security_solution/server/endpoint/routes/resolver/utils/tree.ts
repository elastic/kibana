/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import {
  ResolverEvent,
  ResolverNodeStats,
  ResolverRelatedEvents,
  ResolverAncestry,
  ResolverTree,
  ResolverChildren,
  ResolverRelatedAlerts,
} from '../../../../../common/endpoint/types';
import { createTree } from './node';

interface Node {
  entityID: string;
  lifecycle: ResolverEvent[];
  stats?: ResolverNodeStats;
}

export interface Options {
  relatedEvents?: ResolverRelatedEvents;
  ancestry?: ResolverAncestry;
  children?: ResolverChildren;
  relatedAlerts?: ResolverRelatedAlerts;
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
 *
 * This Tree's root/origin could be in the middle of the tree. The origin corresponds to the id passed in when this
 * Tree object is constructed. The tree can have ancestors and children coming from the origin.
 */
export class Tree {
  protected cache: Map<string, Node> = new Map();
  protected tree: ResolverTree;

  constructor(protected readonly id: string, options: Options = {}) {
    const tree = createTree(this.id);
    this.tree = tree;
    this.cache.set(id, tree);

    this.addRelatedEvents(options.relatedEvents);
    this.addAncestors(options.ancestry);
    this.addChildren(options.children);
    this.addRelatedAlerts(options.relatedAlerts);
  }

  /**
   * Return the origin node. The origin node is the node with the id that the tree was built using.
   *
   * @returns the origin ResolverNode
   */
  public render(): ResolverTree {
    return this.tree;
  }

  /**
   * Returns an array of all the unique IDs for the nodes stored in this tree.
   *
   * @returns an array of strings representing the unique IDs for the nodes in the tree
   */
  public ids(): string[] {
    return [...this.cache.keys()];
  }

  /**
   * Add related events for the tree's origin node. Related events cannot be added for other nodes.
   *
   * @param relatedEventsInfo is the related events and pagination information to add to the tree.
   */
  private addRelatedEvents(relatedEventsInfo: ResolverRelatedEvents | undefined) {
    if (!relatedEventsInfo) {
      return;
    }

    this.tree.relatedEvents.events = relatedEventsInfo.events;
    this.tree.relatedEvents.nextEvent = relatedEventsInfo.nextEvent;
  }

  /**
   * Add alerts for the tree's origin node. Alerts cannot be added for other nodes.
   *
   * @param alertInfo is the alerts and pagination information to add to the tree.
   */
  private addRelatedAlerts(alertInfo: ResolverRelatedAlerts | undefined) {
    if (!alertInfo) {
      return;
    }

    this.tree.relatedAlerts.alerts = alertInfo.alerts;
    this.tree.relatedAlerts.nextAlert = alertInfo.nextAlert;
  }

  /**
   * Add ancestors to the tree.
   *
   * @param ancestorInfo is the ancestors and pagination information to add to the tree.
   */
  private addAncestors(ancestorInfo: ResolverAncestry | undefined) {
    if (!ancestorInfo) {
      return;
    }

    this.tree.ancestry.nextAncestor = ancestorInfo.nextAncestor;

    // the ancestry info holds the lifecycle events for the root of the tree too, so we need to pull that out
    ancestorInfo.ancestors.forEach((node) => {
      if (node.entityID === this.id) {
        this.tree.lifecycle = node.lifecycle;
        return;
      }
      this.cache.set(node.entityID, node);
      this.tree.ancestry.ancestors.push(node);
    });
  }

  /**
   * Add statistics to a node.
   *
   * @param id unique node ID to add the stats information to
   * @param stats information indicating how many related events, and alerts exist for the specific node.
   */
  public addStats(id: string, stats: ResolverNodeStats) {
    const currentNode = this.cache.get(id);
    if (currentNode !== undefined) {
      currentNode.stats = stats;
    }
  }

  private addChildren(children: ResolverChildren | undefined) {
    if (!children) {
      return;
    }

    this.tree.children = children;

    children.childNodes.forEach((child) => {
      this.cache.set(child.entityID, child);
    });
  }
}
