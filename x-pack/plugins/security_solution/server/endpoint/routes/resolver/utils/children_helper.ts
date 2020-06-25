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
import { createChild } from './node';
import { TotalsPaginationBuilder } from './totals_pagination';

/**
 * This class helps construct the children structure when building a resolver tree.
 */
export class ChildrenNodesHelper {
  private readonly entityToNodeCache: Map<string, ChildNode> = new Map();
  private readonly parentToStartEvents: Map<string, Map<string, ResolverEvent>> = new Map();
  private readonly incompleteNodes: Set<string> = new Set();

  constructor(private readonly rootID: string) {
    this.entityToNodeCache.set(rootID, createChild(rootID));
  }

  /**
   * Constructs a ResolverChildren response based on the children that were previously add.
   */
  getNodes(): ResolverChildren {
    const cacheCopy: Map<string, ChildNode> = new Map(this.entityToNodeCache);
    const rootNode = cacheCopy.get(this.rootID);
    let rootNextChild = null;

    if (rootNode) {
      rootNextChild = rootNode.nextChild;
    }

    cacheCopy.delete(this.rootID);
    return {
      childNodes: Array.from(cacheCopy.values()),
      nextChild: rootNextChild || null,
    };
  }

  getEntityIDs(): string[] {
    const cacheCopy: Map<string, ChildNode> = new Map(this.entityToNodeCache);
    cacheCopy.delete(this.rootID);
    return Array.from(cacheCopy.keys());
  }

  getNumNodes(): number {
    // -1 because the root node is in the cache too
    return this.entityToNodeCache.size - 1;
  }

  getIncompleteNodes(): Set<string> {
    return new Set(this.incompleteNodes);
  }

  addLifecycleEvents(lifecycle: ResolverEvent[]) {
    for (const event of lifecycle) {
      const entityID = entityId(event);
      if (entityID) {
        const cachedChild = this.getOrCreateChildNode(entityID);
        cachedChild.lifecycle.push(event);
      } else {
        // TODO log something
      }
    }
  }

  addPagination(totals: Record<string, number>, startEvents: ResolverEvent[]) {
    for (const event of startEvents) {
      const entityID = entityId(event);
      const parentID = parentEntityId(event);
      if (entityID && parentID && isProcessStart(event)) {
        // don't actually add the start event to the node, because that'll be done in
        // a different call
        this.getOrCreateChildNode(entityID);
        this.addStartEvent(event);
      } else {
        // TODO log warning
      }
    }
    this.addChildrenPagination(totals);
  }

  private getOrCreateChildNode(entityID: string) {
    let cachedChild = this.entityToNodeCache.get(entityID);
    if (!cachedChild) {
      // Add the current node to the set of incomplete nodes if we haven't seen it before. When we handle pagination later
      // we will determine if it is a parent node and we might get the totals back for it, otherwise we can assume it as
      // children that should be retrieved
      this.incompleteNodes.add(entityID);
      cachedChild = createChild(entityID);
      this.entityToNodeCache.set(entityID, cachedChild);
    }
    return cachedChild;
  }

  private addStartEvent(event: ResolverEvent) {
    const parentID = parentEntityId(event);
    const entityID = entityId(event);
    if (!parentID || !entityID) {
      return;
    }

    let startEvents = this.parentToStartEvents.get(parentID);
    if (startEvents === undefined) {
      startEvents = new Map();
      // Add the parent to the set of incomplete nodes if we haven't seen it before. When we handle pagination later
      // we will know for sure if we have all the children and remove it then
      this.incompleteNodes.add(parentID);
      this.parentToStartEvents.set(parentID, startEvents);
    }
    startEvents.set(entityID, event);
  }

  // TODO rewrite this to instead of setting the pagination, set whether the node has more children, we won't always know
  // but in some cases we will for sure
  private addChildrenPagination(totals: Record<string, number>) {
    Object.entries(totals).forEach(([parentID, total]) => {
      const parentNode = this.entityToNodeCache.get(parentID);
      const childrenStartEvents = this.parentToStartEvents.get(parentID);
      if (parentNode && childrenStartEvents) {
        parentNode.nextChild = TotalsPaginationBuilder.buildCursor(
          total,
          Array.from(childrenStartEvents.values())
        );
        if (parentNode.nextChild === null) {
          this.incompleteNodes.delete(parentNode.entityID);
        } else {
          this.incompleteNodes.add(parentNode.entityID);
        }
      }
    });
  }
}
