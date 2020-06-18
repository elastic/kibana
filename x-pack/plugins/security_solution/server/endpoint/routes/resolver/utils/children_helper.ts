/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  entityId,
  parentEntityId,
  isProcessStart,
} from '../../../../../common/endpoint/models/event';
import { ChildNode, ResolverEvent, ResolverChildren } from '../../../../../common/endpoint/types';
import { PaginationBuilder } from './pagination';
import { createChild } from './node';

/**
 * This class helps construct the children structure when building a resolver tree.
 */
export class ChildrenNodesHelper {
  private readonly cache: Map<string, ChildNode> = new Map();

  constructor(private readonly rootID: string) {
    this.cache.set(rootID, createChild(rootID));
  }

  /**
   * Constructs a ResolverChildren response based on the children that were previously add.
   */
  getNodes(): ResolverChildren {
    const cacheCopy: Map<string, ChildNode> = new Map(this.cache);
    const rootNode = cacheCopy.get(this.rootID);
    let rootNextChild = null;

    if (rootNode) {
      rootNextChild = rootNode.nextChild;
    }

    cacheCopy.delete(this.rootID);
    return {
      childNodes: Array.from(cacheCopy.values()),
      nextChild: rootNextChild,
    };
  }

  /**
   * Add children to the cache.
   *
   * @param totals a map of unique node IDs to total number of child nodes
   * @param results events from a children query
   */
  addChildren(totals: Record<string, number>, results: ResolverEvent[]) {
    const startEventsCache: Map<string, ResolverEvent[]> = new Map();

    results.forEach((event) => {
      const entityID = entityId(event);
      const parentID = parentEntityId(event);
      if (!entityID || !parentID) {
        return;
      }

      let cachedChild = this.cache.get(entityID);
      if (!cachedChild) {
        cachedChild = createChild(entityID);
        this.cache.set(entityID, cachedChild);
      }
      cachedChild.lifecycle.push(event);

      if (isProcessStart(event)) {
        let startEvents = startEventsCache.get(parentID);
        if (startEvents === undefined) {
          startEvents = [];
          startEventsCache.set(parentID, startEvents);
        }
        startEvents.push(event);
      }
    });

    this.addChildrenPagination(startEventsCache, totals);
  }

  private addChildrenPagination(
    startEventsCache: Map<string, ResolverEvent[]>,
    totals: Record<string, number>
  ) {
    Object.entries(totals).forEach(([parentID, total]) => {
      const parentNode = this.cache.get(parentID);
      const childrenStartEvents = startEventsCache.get(parentID);
      if (parentNode && childrenStartEvents) {
        parentNode.nextChild = PaginationBuilder.buildCursor(total, childrenStartEvents);
      }
    });
  }
}
