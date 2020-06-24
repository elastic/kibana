/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EndpointDocGenerator,
  Tree,
  Event,
  TreeNode,
} from '../../../../../common/endpoint/generate_data';
import { ChildrenNodesHelper } from './children_helper';
import {
  eventId,
  entityId,
  parentEntityId,
  isProcessStart,
} from '../../../../../common/endpoint/models/event';
import { ResolverEvent, ResolverChildren } from '../../../../../common/endpoint/types';

function findParents(children: Map<string, TreeNode>): ResolverEvent[] {
  const parents: ResolverEvent[] = [];
  for (const node of children.values()) {
    const parentID = parentEntityId(node.lifecycle[0]);
    if (parentID) {
      const parentNode = children.get(parentID);
      if (parentNode) {
        parents.push(parentNode.lifecycle[0]);
      }
    }
  }

  return parents;
}

function findNode(tree: ResolverChildren, id: string) {
  return tree.childNodes.find((node) => {
    return node.entityID === id;
  });
}

function getStartEvents(events: ResolverEvent[]): ResolverEvent[] {
  const startEvents: ResolverEvent[] = [];
  for (const event of events) {
    if (isProcessStart(event)) {
      startEvents.push(event);
    }
  }
  return startEvents;
}

function getAllChildrenEvents(tree: Tree) {
  const children: Event[] = [];
  for (const child of tree.children.values()) {
    children.push(...child.lifecycle);
  }
  return children;
}

describe('Children helper', () => {
  const generator = new EndpointDocGenerator();

  let tree: Tree;
  let helper: ChildrenNodesHelper;
  beforeEach(() => {
    tree = generator.generateTree({
      children: 3,
      alwaysGenMaxChildrenPerNode: true,
      generations: 3,
      percentTerminated: 100,
    });
    helper = new ChildrenNodesHelper(tree.origin.id);
  });

  it('returns the correct entity_ids', () => {
    const children = getAllChildrenEvents(tree);
    helper.addLifecycleEvents(children);
    expect(helper.getEntityIDs()).toEqual(Array.from(tree.children.keys()));
  });

  it('returns the incomplete nodes', () => {
    const children = getAllChildrenEvents(tree);
    const parents = findParents(tree.children);

    const totals = {
      [tree.origin.id]: 100,
      [entityId(parents[0])]: 10,
      [entityId(parents[1])]: 0,
    };

    helper.addPagination(totals, getStartEvents(children));
    helper.addLifecycleEvents(children);
    const incompleteNodes = helper.getIncompleteNodes();
    expect(incompleteNodes.size).toEqual(2);
    expect(incompleteNodes.has(entityId(parents[0]))).toBeTruthy();
    expect(incompleteNodes.has(tree.origin.id)).toBeTruthy();
    expect(incompleteNodes.has(entityId(parents[1]))).toBeFalsy();
  });

  it('builds the children response structure', () => {
    const children = getAllChildrenEvents(tree);

    // because we requested the generator to always return the max children, there will always be at least 2 parents
    const parents = findParents(tree.children);

    // this represents the aggregation returned from elastic search
    // each node in the tree should have 3 children, so if these values are greater than 3 there should be
    // pagination cursors created for those children
    const totals = {
      [tree.origin.id]: 100,
      [entityId(parents[0])]: 10,
      [entityId(parents[1])]: 0,
    };

    helper.addPagination(totals, getStartEvents(children));
    helper.addLifecycleEvents(children);
    const childrenNodes = helper.getNodes();
    expect(childrenNodes.nextChild).not.toBeNull();

    let parent = findNode(childrenNodes, entityId(parents[0]));
    expect(parent?.nextChild).not.toBeNull();
    parent = findNode(childrenNodes, entityId(parents[1]));
    expect(parent?.nextChild).toBeNull();

    childrenNodes.childNodes.forEach((node) => {
      node.lifecycle.forEach((event) => {
        expect(children.find((child) => child.event.id === eventId(event))).toEqual(event);
      });
    });
  });

  it('builds the children response structure twice', () => {
    const children = getAllChildrenEvents(tree);
    helper.addLifecycleEvents(children);
    helper.getNodes();

    const childrenNodes = helper.getNodes();
    childrenNodes.childNodes.forEach((node) => {
      node.lifecycle.forEach((event) => {
        expect(children.find((child) => child.event.id === eventId(event))).toEqual(event);
      });
    });
  });
});
