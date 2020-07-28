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
import { eventId, isProcessStart } from '../../../../../common/endpoint/models/event';

function getStartEvents(events: Event[]): Event[] {
  const startEvents: Event[] = [];
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

function getStartEventsFromLevels(levels: Array<Map<string, TreeNode>>) {
  const startEvents: Event[] = [];
  for (const level of levels) {
    for (const node of level.values()) {
      startEvents.push(...getStartEvents(node.lifecycle));
    }
  }

  return startEvents;
}

describe('Children helper', () => {
  const generator = new EndpointDocGenerator();

  let tree: Tree;
  let helper: ChildrenNodesHelper;
  let childrenEvents: Event[];
  let childrenStartEvents: Event[];
  beforeEach(() => {
    tree = generator.generateTree({
      children: 3,
      alwaysGenMaxChildrenPerNode: true,
      generations: 3,
      percentTerminated: 100,
      ancestryArraySize: 2,
    });
    helper = new ChildrenNodesHelper(tree.origin.id, tree.children.size);
    childrenEvents = getAllChildrenEvents(tree);
    childrenStartEvents = getStartEvents(childrenEvents);
  });

  it('returns the correct entity_ids', () => {
    helper.addLifecycleEvents(childrenEvents);
    expect(helper.getEntityIDs()).toEqual(Array.from(tree.children.keys()));
  });

  it('returns the correct number of nodes', () => {
    helper.addLifecycleEvents(childrenEvents);
    expect(helper.getNumNodes()).toEqual(tree.children.size);
  });

  it('marks the query nodes as null', () => {
    // +1 indicates that we haven't received all the results so it should create a pagination cursor for the
    // queried node (aka the origin that we're passing in)
    helper = new ChildrenNodesHelper(tree.origin.id, tree.children.size + 1);

    const nextQuery = helper.addStartEvents(new Set([tree.origin.id]), childrenStartEvents);
    helper.addStartEvents(nextQuery!, []);
    const nodes = helper.getNodes();
    expect(nodes.nextChild).toBeNull();
    for (const node of nodes.childNodes) {
      expect(node.nextChild).toBeNull();
    }
  });

  it('returns undefined when the limit is reached', () => {
    helper = new ChildrenNodesHelper(tree.origin.id, tree.children.size - 1);

    expect(helper.addStartEvents(new Set([tree.origin.id]), childrenStartEvents)).toBeUndefined();
  });

  it('handles multiple additions of start events', () => {
    // + 1 indicates that we got everything that ES had
    helper = new ChildrenNodesHelper(tree.origin.id, childrenStartEvents.length + 1);

    const level1And2 = getStartEventsFromLevels(tree.childrenLevels.slice(0, 2));
    let nextQuery = helper.addStartEvents(new Set([tree.origin.id]), level1And2);
    expect(nextQuery?.size).toEqual(tree.childrenLevels[1].size);
    for (const node of tree.childrenLevels[1].values()) {
      expect(nextQuery?.has(node.id)).toBeTruthy();
    }

    const level3 = getStartEventsFromLevels(tree.childrenLevels.slice(2, 3));
    nextQuery = helper.addStartEvents(nextQuery!, level3);
    expect(nextQuery).toBeUndefined();
    const nodes = helper.getNodes();
    expect(nodes.nextChild).toBeNull();
    for (const node of nodes.childNodes) {
      expect(node.nextChild).toBeNull();
    }
  });

  it('handles an empty set', () => {
    helper = new ChildrenNodesHelper(tree.origin.id, 1);

    const nextQuery = helper.addStartEvents(new Set([tree.origin.id]), []);
    expect(nextQuery).toBeUndefined();
    const nodes = helper.getNodes();
    expect(nodes.nextChild).toBeNull();
    expect(nodes.childNodes.length).toEqual(0);
  });

  it('handles an empty set after multiple additions', () => {
    // + 1 indicates that we got everything that ES had
    helper = new ChildrenNodesHelper(tree.origin.id, childrenStartEvents.length + 1);

    const level1And2 = getStartEventsFromLevels(tree.childrenLevels.slice(0, 2));
    let nextQuery = helper.addStartEvents(new Set([tree.origin.id]), level1And2);

    nextQuery = helper.addStartEvents(nextQuery!, []);
    expect(nextQuery).toBeUndefined();
    const nodes = helper.getNodes();
    expect(nodes.nextChild).toBeNull();
    for (const node of nodes.childNodes) {
      expect(node.nextChild).toBeNull();
    }
  });

  it('non leaf nodes are set to undefined by default', () => {
    // + 1 indicates that we got everything that ES had
    helper = new ChildrenNodesHelper(tree.origin.id, childrenStartEvents.length + 1);
    const level1And2 = getStartEventsFromLevels(tree.childrenLevels.slice(0, 2));
    helper.addStartEvents(new Set([tree.origin.id]), level1And2);
    const nodes = helper.getNodes();
    expect(nodes.nextChild).toBeNull();
    for (const node of nodes.childNodes) {
      if (tree.childrenLevels[0].has(node.entityID)) {
        expect(node.nextChild).toBeNull();
      } else {
        expect(node.nextChild).toBeUndefined();
      }
    }
  });

  it('returns the leaf nodes', () => {
    helper = new ChildrenNodesHelper(tree.origin.id, tree.children.size + 1);

    const nextQuery = helper.addStartEvents(new Set([tree.origin.id]), childrenStartEvents);
    // we're using an ancestry array of 2 so the leaf nodes are at the second level
    expect(nextQuery?.size).toEqual(tree.childrenLevels[1].size);

    for (const node of tree.childrenLevels[1].values()) {
      expect(nextQuery?.has(node.id)).toBeTruthy();
    }
  });

  it('builds the children response structure', () => {
    helper.addStartEvents(new Set([tree.origin.id]), childrenStartEvents);
    helper.addLifecycleEvents(childrenEvents);
    const childrenNodes = helper.getNodes();

    // since we got all the nodes all the nextChild cursors should be null
    for (const node of childrenNodes.childNodes) {
      expect(node.nextChild).toBeUndefined();
    }
    expect(childrenNodes.nextChild).not.toBeNull();

    childrenNodes.childNodes.forEach((node) => {
      node.lifecycle.forEach((event) => {
        expect(childrenEvents.find((child) => child.event.id === eventId(event))).toEqual(event);
      });
    });
  });

  it('builds the children response structure twice', () => {
    helper.addLifecycleEvents(childrenEvents);
    helper.getNodes();

    const childrenNodes = helper.getNodes();
    childrenNodes.childNodes.forEach((node) => {
      node.lifecycle.forEach((event) => {
        expect(childrenEvents.find((child) => child.event.id === eventId(event))).toEqual(event);
      });
    });
  });
});
