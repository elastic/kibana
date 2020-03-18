/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EndpointDocGenerator, Event } from './generate_data';

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

  describe('creates alert ancestor tree', () => {
    let events: Event[];

    beforeEach(() => {
      events = generator.generateAlertEventAncestry(3);
    });

    it('with n-1 process events', () => {
      for (let i = 1; i < events.length - 1; i++) {
        expect(events[i].process.parent?.entity_id).toEqual(events[i - 1].process.entity_id);
        expect(events[i].event.kind).toEqual('event');
        expect(events[i].event.category).toEqual('process');
      }
    });

    it('with a corresponding alert at the end', () => {
      // The alert should be last and have the same entity_id as the previous process event
      expect(events[events.length - 1].process.entity_id).toEqual(
        events[events.length - 2].process.entity_id
      );
      expect(events[events.length - 1].process.parent?.entity_id).toEqual(
        events[events.length - 2].process.parent?.entity_id
      );
      expect(events[events.length - 1].event.kind).toEqual('alert');
      expect(events[events.length - 1].event.category).toEqual('malware');
    });
  });

  function buildResolverTree(events: Event[]): Node {
    // First pass we gather up all the events by entity_id
    const tree: Record<string, Node> = {};
    events.forEach(event => {
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
      nodes.forEach(node => {
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
    const events = [root, ...generator.generateDescendantsTree(root, generations)];
    const rootNode = buildResolverTree(events);
    const visitedEvents = countResolverEvents(rootNode, generations);
    expect(visitedEvents).toEqual(events.length);
  });

  it('creates full resolver tree', () => {
    const alertAncestors = 3;
    const generations = 2;
    const events = generator.generateFullResolverTree(alertAncestors, generations);
    const rootNode = buildResolverTree(events);
    const visitedEvents = countResolverEvents(rootNode, alertAncestors + generations);
    expect(visitedEvents).toEqual(events.length);
  });
});
