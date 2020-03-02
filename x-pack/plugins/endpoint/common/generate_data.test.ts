/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EndpointDocGenerator, generateEventAncestry, generateResolverTree } from './generate_data';
import { Node } from './types';

describe('data generator', () => {
  let generator: EndpointDocGenerator;
  beforeEach(() => {
    generator = new EndpointDocGenerator();
  });

  it('creates endpoint metadata documents', () => {
    const timestamp = new Date();
    const metadata = generator.generateEndpointMetadata(timestamp);
    expect(metadata['@timestamp']).toEqual(timestamp);
    expect(metadata.event.created).toEqual(timestamp);
    expect(metadata.endpoint).not.toBeNull();
    expect(metadata.agent).not.toBeNull();
    expect(metadata.host).not.toBeNull();
  });

  it('creates alert event documents', () => {
    const timestamp = new Date();
    const alert = generator.generateAlert(timestamp);
    expect(alert['@timestamp']).toEqual(timestamp);
    expect(alert.event.action).not.toBeNull();
    expect(alert.endpoint).not.toBeNull();
    expect(alert.agent).not.toBeNull();
    expect(alert.host).not.toBeNull();
    expect(alert.process.entity_id).not.toBeNull();
  });

  it('creates process event documents', () => {
    const timestamp = new Date();
    const processEvent = generator.generateEvent(timestamp);
    expect(processEvent['@timestamp']).toEqual(timestamp);
    expect(processEvent.event.category).toEqual('process');
    expect(processEvent.event.kind).toEqual('event');
    expect(processEvent.event.type).toEqual('creation');
    expect(processEvent.agent).not.toBeNull();
    expect(processEvent.host).not.toBeNull();
    expect(processEvent.process.entity_id).not.toBeNull();
  });

  it('creates other event documents', () => {
    const timestamp = new Date();
    const processEvent = generator.generateEvent(timestamp, undefined, undefined, 'dns');
    expect(processEvent['@timestamp']).toEqual(timestamp);
    expect(processEvent.event.category).toEqual('dns');
    expect(processEvent.event.kind).toEqual('event');
    expect(processEvent.event.type).toEqual('creation');
    expect(processEvent.agent).not.toBeNull();
    expect(processEvent.host).not.toBeNull();
    expect(processEvent.process.entity_id).not.toBeNull();
  });

  it('creates alert ancestor tree', () => {
    const events = generateEventAncestry(generator, 3);
    for (let i = 1; i < events.length - 1; i++) {
      expect(events[i].process.parent?.entity_id).toEqual(events[i - 1].process.entity_id);
      expect(events[i].event.kind).toEqual('event');
      expect(events[i].event.category).toEqual('process');
    }
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

  it('creates tree of process children', () => {
    const timestamp = new Date();
    const root = generator.generateEvent(timestamp);
    const generations = 2;
    const events = generateResolverTree(root, generator, generations);
    const tree: Record<string, Node> = {};
    // First pass we gather up all the events by entity_id
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
    for (const [key, value] of Object.entries(tree)) {
      if (value.parent_entity_id) {
        tree[value.parent_entity_id].children.push(value);
      }
    }
    // Start at the root, traverse N levels of the tree and check that we found all nodes
    let nodes = [tree[root.process.entity_id]];
    let visitedEvents = 0;
    for (let i = 0; i < generations + 1; i++) {
      let nextNodes: Node[] = [];
      nodes.forEach(node => {
        nextNodes = nextNodes.concat(node.children);
        visitedEvents += node.events.length;
      });
      nodes = nextNodes;
    }
    expect(visitedEvents).toEqual(events.length);
  });
});
