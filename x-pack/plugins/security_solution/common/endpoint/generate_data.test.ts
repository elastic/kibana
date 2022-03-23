/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import {
  EndpointDocGenerator,
  Event,
  Tree,
  TreeNode,
  RelatedEventCategory,
  ECSCategory,
  ANCESTRY_LIMIT,
} from './generate_data';
import { firstNonNullValue, values } from './models/ecs_safety_helpers';
import {
  entityIDSafeVersion,
  parentEntityIDSafeVersion,
  timestampSafeVersion,
} from './models/event';

interface Node {
  events: Event[];
  children: Node[];
  parent_entity_id?: string;
}

describe('data generator data streams', () => {
  it('creates a generator with default data streams', () => {
    const generator = new EndpointDocGenerator('seed');
    expect(generator.generateHostMetadata().data_stream).toEqual({
      type: 'metrics',
      dataset: 'endpoint.metadata',
      namespace: 'default',
    });
    expect(generator.generatePolicyResponse().data_stream).toEqual({
      type: 'metrics',
      dataset: 'endpoint.policy',
      namespace: 'default',
    });
    expect(generator.generateEvent().data_stream).toEqual({
      type: 'logs',
      dataset: 'endpoint.events.process',
      namespace: 'default',
    });
    expect(generator.generateAlert().data_stream).toEqual({
      type: 'logs',
      dataset: 'endpoint.alerts',
      namespace: 'default',
    });
  });

  it('creates a generator with custom data streams', () => {
    const metadataDataStream = { type: 'meta', dataset: 'dataset', namespace: 'name' };
    const policyDataStream = { type: 'policy', dataset: 'fake', namespace: 'something' };
    const eventsDataStream = { type: 'events', dataset: 'events stuff', namespace: 'name' };
    const alertsDataStream = { type: 'alerts', dataset: 'alerts stuff', namespace: 'name' };
    const generator = new EndpointDocGenerator('seed');
    expect(generator.generateHostMetadata(0, metadataDataStream).data_stream).toStrictEqual(
      metadataDataStream
    );
    expect(generator.generatePolicyResponse({ policyDataStream }).data_stream).toStrictEqual(
      policyDataStream
    );
    expect(generator.generateEvent({ eventsDataStream }).data_stream).toStrictEqual(
      eventsDataStream
    );
    expect(generator.generateAlert({ alertsDataStream }).data_stream).toStrictEqual(
      alertsDataStream
    );
  });
});

describe('data generator', () => {
  let generator: EndpointDocGenerator;
  beforeEach(() => {
    generator = new EndpointDocGenerator('seed');
  });

  it('creates events with a numerically increasing sequence value', () => {
    const event1 = generator.generateEvent();
    const event2 = generator.generateEvent();

    expect(event2.event?.sequence).toBe((firstNonNullValue(event1.event?.sequence) ?? 0) + 1);
  });

  // Lets run this one multiple times just to ensure that the randomness
  // is truly predicable based on the seed passed
  it.each([1, 2, 3, 4, 5])('[%#] creates the same documents with same random seed', () => {
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
    expect(metadata.Endpoint).not.toBeNull();
    expect(metadata.agent).not.toBeNull();
    expect(metadata.host).not.toBeNull();
  });

  it('creates policy response documents', () => {
    const timestamp = new Date().getTime();
    const hostPolicyResponse = generator.generatePolicyResponse({ ts: timestamp });
    expect(hostPolicyResponse['@timestamp']).toEqual(timestamp);
    expect(hostPolicyResponse.event.created).toEqual(timestamp);
    expect(hostPolicyResponse.Endpoint).not.toBeNull();
    expect(hostPolicyResponse.agent).not.toBeNull();
    expect(hostPolicyResponse.host).not.toBeNull();
    expect(hostPolicyResponse.Endpoint.policy.applied).not.toBeNull();
  });

  it('creates alert event documents', () => {
    const timestamp = new Date().getTime();
    const alert = generator.generateAlert({ ts: timestamp });
    expect(alert['@timestamp']).toEqual(timestamp);
    expect(alert.event?.action).not.toBeNull();
    expect(alert.event?.code).not.toBeNull();
    expect(alert.Endpoint).not.toBeNull();
    expect(alert.agent).not.toBeNull();
    expect(alert.host).not.toBeNull();
    expect(alert.process?.entity_id).not.toBeNull();
  });

  it('creates process event documents', () => {
    const timestamp = new Date().getTime();
    const processEvent = generator.generateEvent({ timestamp });
    expect(processEvent['@timestamp']).toEqual(timestamp);
    expect(processEvent.event?.category).toEqual(['process']);
    expect(processEvent.event?.kind).toEqual('event');
    expect(processEvent.event?.type).toEqual(['start']);
    expect(processEvent.agent).not.toBeNull();
    expect(processEvent.host).not.toBeNull();
    expect(processEvent.process?.entity_id).not.toBeNull();
    expect(processEvent.process?.name).not.toBeNull();
  });

  it('creates other event documents', () => {
    const timestamp = new Date().getTime();
    const processEvent = generator.generateEvent({ timestamp, eventCategory: 'dns' });
    expect(processEvent['@timestamp']).toEqual(timestamp);
    expect(processEvent.event?.category).toEqual('dns');
    expect(processEvent.event?.kind).toEqual('event');
    expect(processEvent.event?.type).toEqual(['start']);
    expect(processEvent.agent).not.toBeNull();
    expect(processEvent.host).not.toBeNull();
    expect(processEvent.process?.entity_id).not.toBeNull();
    expect(processEvent.process?.name).not.toBeNull();
  });

  describe('creates events with an empty ancestry array', () => {
    let tree: Tree;
    beforeEach(() => {
      tree = generator.generateTree({
        alwaysGenMaxChildrenPerNode: true,
        ancestors: 3,
        children: 3,
        generations: 3,
        percentTerminated: 100,
        percentWithRelated: 100,
        relatedEvents: 0,
        relatedAlerts: 0,
        ancestryArraySize: 0,
      });
      tree.ancestry.delete(tree.origin.id);
    });

    it('creates all events with an empty ancestry array', () => {
      for (const event of tree.allEvents) {
        expect(event.process?.Ext?.ancestry?.length).toEqual(0);
      }
    });
  });

  describe('creates an origin alert when no related alerts are requested', () => {
    let tree: Tree;
    beforeEach(() => {
      tree = generator.generateTree({
        alwaysGenMaxChildrenPerNode: true,
        ancestors: 3,
        children: 3,
        generations: 3,
        percentTerminated: 100,
        percentWithRelated: 100,
        relatedEvents: 0,
        relatedAlerts: 0,
        ancestryArraySize: ANCESTRY_LIMIT,
      });
      tree.ancestry.delete(tree.origin.id);
    });

    it('creates an alert for the origin node but no other nodes', () => {
      for (const node of tree.ancestry.values()) {
        expect(node.relatedAlerts.length).toEqual(0);
      }

      for (const node of tree.children.values()) {
        expect(node.relatedAlerts.length).toEqual(0);
      }

      expect(tree.origin.relatedAlerts.length).toEqual(1);
    });
  });

  describe('creates a resolver tree structure', () => {
    let tree: Tree;
    const ancestors = 3;
    const childrenPerNode = 3;
    const generations = 3;
    const relatedAlerts = 4;

    beforeEach(() => {
      tree = generator.generateTree({
        alwaysGenMaxChildrenPerNode: true,
        ancestors,
        children: childrenPerNode,
        generations,
        percentTerminated: 100,
        percentWithRelated: 100,
        relatedEvents: [
          { category: RelatedEventCategory.Driver, count: 1 },
          { category: RelatedEventCategory.File, count: 2 },
          { category: RelatedEventCategory.Network, count: 1 },
        ],
        relatedEventsOrdered: true,
        relatedAlerts,
        ancestryArraySize: ANCESTRY_LIMIT,
      });
    });

    const eventInNode = (event: Event, node: TreeNode) => {
      const inLifecycle = node.lifecycle.includes(event);
      const inRelated = node.relatedEvents.includes(event);
      const inRelatedAlerts = node.relatedAlerts.includes(event);

      return (inRelated || inRelatedAlerts || inLifecycle) && event.process?.entity_id === node.id;
    };

    const verifyAncestry = (event: Event, genTree: Tree) => {
      const ancestry = values(event.process?.Ext?.ancestry);
      if (ancestry.length > 0) {
        expect(event.process?.parent?.entity_id).toBe(ancestry[0]);
      }
      for (let i = 0; i < ancestry.length; i++) {
        const ancestor = ancestry[i];
        const parent = genTree.children.get(ancestor) || genTree.ancestry.get(ancestor);
        expect(ancestor).toBe(parent?.lifecycle[0].process?.entity_id);

        // the next ancestor should be the grandparent
        if (i + 1 < ancestry.length) {
          const grandparent = ancestry[i + 1];
          expect(grandparent).toBe(parent?.lifecycle[0].process?.parent?.entity_id);
        }
      }
    };

    it('sets the start and end times correctly', () => {
      const startOfEpoch = new Date(0);
      let startTime = new Date(timestampSafeVersion(tree.allEvents[0]) ?? startOfEpoch);
      expect(startTime).not.toEqual(startOfEpoch);
      let endTime = new Date(timestampSafeVersion(tree.allEvents[0]) ?? startOfEpoch);
      expect(startTime).not.toEqual(startOfEpoch);

      for (const event of tree.allEvents) {
        const currentEventTime = new Date(timestampSafeVersion(event) ?? startOfEpoch);
        expect(currentEventTime).not.toEqual(startOfEpoch);
        expect(tree.startTime.getTime()).toBeLessThanOrEqual(currentEventTime.getTime());
        expect(tree.endTime.getTime()).toBeGreaterThanOrEqual(currentEventTime.getTime());
        if (currentEventTime < startTime) {
          startTime = currentEventTime;
        }

        if (currentEventTime > endTime) {
          endTime = currentEventTime;
        }
      }
      expect(startTime).toEqual(tree.startTime);
      expect(endTime).toEqual(tree.endTime);
      expect(endTime.getTime() - startTime.getTime()).toBeGreaterThanOrEqual(0);
    });

    it('creates related events in ascending order', () => {
      // the order should not change since it should already be in ascending order
      const relatedEventsAsc = _.cloneDeep(tree.origin.relatedEvents).sort(
        (event1, event2) =>
          (timestampSafeVersion(event1) ?? 0) - (timestampSafeVersion(event2) ?? 0)
      );
      expect(tree.origin.relatedEvents).toStrictEqual(relatedEventsAsc);
    });

    it('has ancestry array defined', () => {
      expect(values(tree.origin.lifecycle[0].process?.Ext?.ancestry).length).toBe(ANCESTRY_LIMIT);
      for (const event of tree.allEvents) {
        verifyAncestry(event, tree);
      }
    });

    it('creates the right number childrenLevels', () => {
      let totalChildren = 0;
      for (const level of tree.childrenLevels) {
        totalChildren += level.size;
      }
      expect(totalChildren).toEqual(tree.children.size);
      expect(tree.childrenLevels.length).toEqual(generations);
    });

    it('has the right nodes in both the childrenLevels and children map', () => {
      for (const level of tree.childrenLevels) {
        for (const node of level.values()) {
          expect(tree.children.get(node.id)).toEqual(node);
        }
      }
    });

    it('groups the children by their parent ID correctly', () => {
      expect(tree.childrenByParent.size).toBe(13);
      expect(tree.childrenByParent.get(tree.origin.id)?.size).toBe(3);

      for (const value of tree.childrenByParent.values()) {
        expect(value.size).toBe(3);
      }

      // loop over everything but the last level because those nodes won't be parents
      for (let i = 0; i < tree.childrenLevels.length - 1; i++) {
        const level = tree.childrenLevels[i];
        // loop over all the nodes in a level
        for (const id of level.keys()) {
          // each node in the level should have 3 children
          expect(tree.childrenByParent.get(id)?.size).toBe(3);

          // let's make sure the children of this ID are actually in the next level and that they are the same reference
          for (const [childID, childNode] of tree.childrenByParent.get(id)!.entries()) {
            expect(tree.childrenLevels[i + 1].get(childID)).toBe(childNode);
          }
        }
      }
    });

    it('has the right related events for each node', () => {
      const checkRelatedEvents = (node: TreeNode) => {
        expect(node.relatedEvents.length).toEqual(4);

        const counts: Record<string, number> = {};
        for (const event of node.relatedEvents) {
          const categories = values(event.event?.category);
          for (const cat of categories) {
            counts[cat] = counts[cat] + 1 || 1;
          }
        }
        expect(counts[ECSCategory.Driver]).toEqual(1);
        expect(counts[ECSCategory.File]).toEqual(2);
        expect(counts[ECSCategory.Network]).toEqual(1);
      };

      for (const node of tree.ancestry.values()) {
        checkRelatedEvents(node);
      }

      for (const node of tree.children.values()) {
        checkRelatedEvents(node);
      }
    });

    it('has the right number of related alerts for each node', () => {
      for (const node of tree.ancestry.values()) {
        expect(node.relatedAlerts.length).toEqual(relatedAlerts);
      }

      for (const node of tree.children.values()) {
        expect(node.relatedAlerts.length).toEqual(relatedAlerts);
      }

      expect(tree.origin.relatedAlerts.length).toEqual(relatedAlerts);
    });

    it('has the right number of ancestors', () => {
      // +1 for the origin node
      expect(tree.ancestry.size).toEqual(ancestors + 1);
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
        const entityID = entityIDSafeVersion(event);
        if (entityID) {
          const ancestor = tree.ancestry.get(entityID);
          if (ancestor) {
            expect(eventInNode(event, ancestor)).toBeTruthy();
            return;
          }

          const children = tree.children.get(entityID);
          if (children) {
            expect(eventInNode(event, children)).toBeTruthy();
          }
        }
      });
    });

    const nodeEventCount = (node: TreeNode) => {
      return node.lifecycle.length + node.relatedEvents.length + node.relatedAlerts.length;
    };

    it('has the correct number of total events', () => {
      let total = 0;
      for (const node of tree.ancestry.values()) {
        total += nodeEventCount(node);
      }

      for (const node of tree.children.values()) {
        total += nodeEventCount(node);
      }

      expect(tree.allEvents.length).toEqual(total);
    });
  });

  describe('creates alert ancestor tree', () => {
    let events: Event[];

    const isCategoryProcess = (event: Event) => {
      const category = values(event.event?.category);
      return _.isEqual(category, ['process']);
    };

    beforeEach(() => {
      events = generator.createAlertEventAncestry({
        ancestors: 3,
        percentTerminated: 0,
        percentWithRelated: 0,
      });
    });

    it('with n-1 process events', () => {
      for (let i = events.length - 2; i > 0; ) {
        const parentEntityIdOfChild = parentEntityIDSafeVersion(events[i]);
        for (
          ;
          --i >= -1 && (events[i].event?.kind !== 'event' || !isCategoryProcess(events[i]));

        ) {
          // related event - skip it
        }
        expect(i).toBeGreaterThanOrEqual(0);
        expect(parentEntityIdOfChild).toEqual(entityIDSafeVersion(events[i]));
      }
    });

    it('with a corresponding alert at the end', () => {
      let previousProcessEventIndex = events.length - 2;
      for (
        ;
        previousProcessEventIndex >= -1 &&
        (events[previousProcessEventIndex].event?.kind !== 'event' ||
          !isCategoryProcess(events[previousProcessEventIndex]));
        previousProcessEventIndex--
      ) {
        // related event - skip it
      }
      expect(previousProcessEventIndex).toBeGreaterThanOrEqual(0);
      // The alert should be last and have the same entity_id as the previous process event
      expect(events[events.length - 1].process?.entity_id).toEqual(
        events[previousProcessEventIndex].process?.entity_id
      );
      expect(events[events.length - 1].process?.parent?.entity_id).toEqual(
        events[previousProcessEventIndex].process?.parent?.entity_id
      );
      expect(events[events.length - 1].event?.kind).toEqual('alert');
      expect(events[events.length - 1].event?.category).toEqual('malware');
    });
  });

  function buildResolverTree(events: Event[]): Node {
    // First pass we gather up all the events by entity_id
    const tree: Record<string, Node> = {};
    events.forEach((event) => {
      const entityID = entityIDSafeVersion(event);
      if (entityID) {
        if (entityID in tree) {
          tree[entityID].events.push(event);
        } else {
          tree[entityID] = {
            events: [event],
            children: [],
            parent_entity_id: parentEntityIDSafeVersion(event),
          };
        }
      }
    });
    // Second pass add child references to each node
    for (const value of Object.values(tree)) {
      if (value.parent_entity_id) {
        tree[value.parent_entity_id].children.push(value);
      }
    }

    const entityID = entityIDSafeVersion(events[0]);
    if (!entityID) {
      throw new Error('entity id was invalid');
    }

    // The root node must be first in the array or this fails
    return tree[entityID];
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
    const events = [root, ...generator.descendantsTreeGenerator(root, { generations })];
    const rootNode = buildResolverTree(events);
    const visitedEvents = countResolverEvents(rootNode, generations);
    expect(visitedEvents).toEqual(events.length);
  });

  it('creates full resolver tree', () => {
    const alertAncestors = 3;
    const generations = 2;
    const events = [
      ...generator.fullResolverTreeGenerator({ ancestors: alertAncestors, generations }),
    ];
    const rootNode = buildResolverTree(events);
    const visitedEvents = countResolverEvents(rootNode, alertAncestors + generations);
    expect(visitedEvents).toEqual(events.length);
  });

  it('creates full resolver tree with a single entry_leader id', () => {
    const events = [...generator.alertsGenerator(1)];
    const [rootEvent, ...children] = events;
    expect(
      children.every((event) => {
        return (
          event.process?.entry_leader?.entity_id === rootEvent.process?.entry_leader?.entity_id
        );
      })
    ).toBe(true);
  });
});
