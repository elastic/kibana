/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EndpointDocGenerator, Event, Tree, TreeNode } from './generate_data';

interface Node {
  events: Event[];
  children: Node[];
  parent_entity_id?: string;
}

describe('data generator', () => {
  let generator: EndpointDocGenerator;
  beforeEach(() => {
    generator = new EndpointDocGenerator('seed');
  });

  it('creates the same documents with same random seed', () => {
    const generator1 = new EndpointDocGenerator('seed');
    const generator2 = new EndpointDocGenerator('seed');
    const timestamp = new Date().getTime();
    const metadata1 = generator1.generateHostMetadata(timestamp);
    const metadata2 = generator2.generateHostMetadata(timestamp);
    expect(metadata1).toEqual(metadata2);
  });

  it('creates different documents with different random seeds', () => {
    const generator1 = new EndpointDocGenerator('seed');
    const generator2 = new EndpointDocGenerator('different seed');
    const timestamp = new Date().getTime();
    const metadata1 = generator1.generateHostMetadata(timestamp);
    const metadata2 = generator2.generateHostMetadata(timestamp);
    expect(metadata1).not.toEqual(metadata2);
  });

  it('creates host metadata documents', () => {
    const timestamp = new Date().getTime();
    const metadata = generator.generateHostMetadata(timestamp);
    expect(metadata['@timestamp']).toEqual(timestamp);
    expect(metadata.event.created).toEqual(timestamp);
    expect(metadata.endpoint).not.toBeNull();
    expect(metadata.agent).not.toBeNull();
    expect(metadata.host).not.toBeNull();
  });

  it('creates policy response documents', () => {
    const timestamp = new Date().getTime();
    const hostPolicyResponse = generator.generatePolicyResponse(timestamp);
    expect(hostPolicyResponse['@timestamp']).toEqual(timestamp);
    expect(hostPolicyResponse.event.created).toEqual(timestamp);
    expect(hostPolicyResponse.endpoint).not.toBeNull();
    expect(hostPolicyResponse.agent).not.toBeNull();
    expect(hostPolicyResponse.host).not.toBeNull();
    expect(hostPolicyResponse.endpoint.policy.applied).not.toBeNull();
  });

  it('creates alert event documents', () => {
    const timestamp = new Date().getTime();
    const alert = generator.generateAlert(timestamp);
    expect(alert['@timestamp']).toEqual(timestamp);
    expect(alert.event.action).not.toBeNull();
    expect(alert.endpoint).not.toBeNull();
    expect(alert.agent).not.toBeNull();
    expect(alert.host).not.toBeNull();
    expect(alert.process.entity_id).not.toBeNull();
  });

  it('creates process event documents', () => {
    const timestamp = new Date().getTime();
    const processEvent = generator.generateEvent({ timestamp });
    expect(processEvent['@timestamp']).toEqual(timestamp);
    expect(processEvent.event.category).toEqual('process');
    expect(processEvent.event.kind).toEqual('event');
    expect(processEvent.event.type).toEqual('start');
    expect(processEvent.agent).not.toBeNull();
    expect(processEvent.host).not.toBeNull();
    expect(processEvent.process.entity_id).not.toBeNull();
    expect(processEvent.process.name).not.toBeNull();
  });

  it('creates other event documents', () => {
    const timestamp = new Date().getTime();
    const processEvent = generator.generateEvent({ timestamp, eventCategory: 'dns' });
    expect(processEvent['@timestamp']).toEqual(timestamp);
    expect(processEvent.event.category).toEqual('dns');
    expect(processEvent.event.kind).toEqual('event');
    expect(processEvent.event.type).toEqual('start');
    expect(processEvent.agent).not.toBeNull();
    expect(processEvent.host).not.toBeNull();
    expect(processEvent.process.entity_id).not.toBeNull();
    expect(processEvent.process.name).not.toBeNull();
  });

  describe('creates a resolver tree structure', () => {
    let tree: Tree;
    const ancestors = 3;
    const childrenPerNode = 3;
    const generations = 3;
    beforeEach(() => {
      tree = generator.generateTree({
        alwaysGenMaxChildrenPerNode: true,
        ancestors,
        children: childrenPerNode,
        generations,
        percentTerminated: 100,
        percentWithRelated: 100,
        relatedEvents: 4,
      });
    });

    const eventInNode = (event: Event, node: TreeNode) => {
      const inLifecycle = node.lifecycle.includes(event);
      const inRelated = node.relatedEvents.includes(event);

      return (inRelated || inLifecycle) && event.process.entity_id === node.id;
    };

    it('has the right number of ancestors', () => {
      expect(tree.ancestry.size).toEqual(ancestors);
    });

    it('has the right number of total children', () => {
      // the total number of children (not including the origin) = ((childrenPerNode^(generations + 1) - 1) / (childrenPerNode - 1)) - 1
      // https://stackoverflow.com/questions/7842397/what-is-the-total-number-of-nodes-in-a-full-k-ary-tree-in-terms-of-the-number-o
      const leaves = Math.pow(childrenPerNode, generations);
      // last -1 is for the origin since it's not in the children map
      const nodes = (childrenPerNode * leaves - 1) / (childrenPerNode - 1) - 1;
      expect(tree.children.size).toEqual(nodes);
    });

    it('has 2 lifecycle events for ancestors, children, and the origin', () => {
      for (const node of tree.ancestry.values()) {
        expect(node.lifecycle.length).toEqual(2);
      }

      for (const node of tree.children.values()) {
        expect(node.lifecycle.length).toEqual(2);
      }

      expect(tree.origin.lifecycle.length).toEqual(2);
    });

    it('has all events in one of the tree fields', () => {
      expect(tree.allEvents.length).toBeGreaterThan(0);

      tree.allEvents.forEach((event) => {
        if (event.event.kind === 'alert') {
          expect(event).toEqual(tree.alertEvent);
        } else {
          const ancestor = tree.ancestry.get(event.process.entity_id);
          if (ancestor) {
            expect(eventInNode(event, ancestor)).toBeTruthy();
            return;
          }

          const children = tree.children.get(event.process.entity_id);
          if (children) {
            expect(eventInNode(event, children)).toBeTruthy();
            return;
          }

          expect(eventInNode(event, tree.origin)).toBeTruthy();
        }
      });
    });

    const nodeEventCount = (node: TreeNode) => {
      return node.lifecycle.length + node.relatedEvents.length;
    };

    it('has the correct number of total events', () => {
      // starts at 1 because the alert is in the allEvents array
      let total = 1;
      for (const node of tree.ancestry.values()) {
        total += nodeEventCount(node);
      }

      for (const node of tree.children.values()) {
        total += nodeEventCount(node);
      }

      total += nodeEventCount(tree.origin);

      expect(tree.allEvents.length).toEqual(total);
    });
  });

  describe('creates alert ancestor tree', () => {
    let events: Event[];

    beforeEach(() => {
      events = generator.createAlertEventAncestry(3, 0, 0, 0);
    });

    it('with n-1 process events', () => {
      for (let i = events.length - 2; i > 0; ) {
        const parentEntityIdOfChild = events[i].process.parent?.entity_id;
        for (
          ;
          --i >= -1 && (events[i].event.kind !== 'event' || events[i].event.category !== 'process');

        ) {
          // related event - skip it
        }
        expect(i).toBeGreaterThanOrEqual(0);
        expect(parentEntityIdOfChild).toEqual(events[i].process.entity_id);
      }
    });

    it('with a corresponding alert at the end', () => {
      let previousProcessEventIndex = events.length - 2;
      for (
        ;
        previousProcessEventIndex >= -1 &&
        (events[previousProcessEventIndex].event.kind !== 'event' ||
          events[previousProcessEventIndex].event.category !== 'process');
        previousProcessEventIndex--
      ) {
        // related event - skip it
      }
      expect(previousProcessEventIndex).toBeGreaterThanOrEqual(0);
      // The alert should be last and have the same entity_id as the previous process event
      expect(events[events.length - 1].process.entity_id).toEqual(
        events[previousProcessEventIndex].process.entity_id
      );
      expect(events[events.length - 1].process.parent?.entity_id).toEqual(
        events[previousProcessEventIndex].process.parent?.entity_id
      );
      expect(events[events.length - 1].event.kind).toEqual('alert');
      expect(events[events.length - 1].event.category).toEqual('malware');
    });
  });

  function buildResolverTree(events: Event[]): Node {
    // First pass we gather up all the events by entity_id
    const tree: Record<string, Node> = {};
    events.forEach((event) => {
      if (event.process.entity_id in tree) {
        tree[event.process.entity_id].events.push(event);
      } else {
        tree[event.process.entity_id] = {
          events: [event],
          children: [],
          parent_entity_id: event.process.parent?.entity_id,
        };
      }
    });
    // Second pass add child references to each node
    for (const value of Object.values(tree)) {
      if (value.parent_entity_id) {
        tree[value.parent_entity_id].children.push(value);
      }
    }
    // The root node must be first in the array or this fails
    return tree[events[0].process.entity_id];
  }

  function countResolverEvents(rootNode: Node, generations: number): number {
    // Start at the root, traverse N levels of the tree and check that we found all nodes
    let nodes = [rootNode];
    let visitedEvents = 0;
    for (let i = 0; i < generations + 1; i++) {
      let nextNodes: Node[] = [];
      nodes.forEach((node) => {
        nextNodes = nextNodes.concat(node.children);
        visitedEvents += node.events.length;
      });
      nodes = nextNodes;
    }
    return visitedEvents;
  }

  it('creates tree of process children', () => {
    const timestamp = new Date().getTime();
    const root = generator.generateEvent({ timestamp });
    const generations = 2;
    const events = [root, ...generator.descendantsTreeGenerator(root, generations)];
    const rootNode = buildResolverTree(events);
    const visitedEvents = countResolverEvents(rootNode, generations);
    expect(visitedEvents).toEqual(events.length);
  });

  it('creates full resolver tree', () => {
    const alertAncestors = 3;
    const generations = 2;
    const events = [...generator.fullResolverTreeGenerator(alertAncestors, generations)];
    const rootNode = buildResolverTree(events);
    const visitedEvents = countResolverEvents(rootNode, alertAncestors + generations);
    expect(visitedEvents).toEqual(events.length);
  });
});
