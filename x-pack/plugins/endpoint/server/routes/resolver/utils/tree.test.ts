/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EndpointDocGenerator } from '../../../../common/generate_data';
import { Tree } from './tree';
import {
  ResolverAncestry,
  ResolverEvent,
  ResolverRelatedEvents,
  ChildNode,
} from '../../../../common/types';
import { entityId } from '../../../../common/models/event';
import { Fetcher } from './fetch';
import { createChild } from './node';

describe('Tree', () => {
  const generator = new EndpointDocGenerator();

  describe('ancestry', () => {
    // transform the generator's array of events into the format expected by the tree class
    const ancestorInfo: ResolverAncestry = {
      ancestors: generator
        .createAlertEventAncestry(5, 0, 0)
        .filter(event => {
          return event.event.kind === 'event';
        })
        .map(event => {
          return {
            id: event.process.entity_id,
            // The generator returns Events, but the tree needs a ResolverEvent
            lifecycle: [event as ResolverEvent],
          };
        }),
      nextAncestor: 'hello',
    };

    it('adds ancestors to the tree', () => {
      const tree = new Tree(ancestorInfo.ancestors[0].id, { ancestry: ancestorInfo });
      const ids = tree.ids();
      ids.forEach(id => {
        const foundAncestor = ancestorInfo.ancestors.find(
          ancestor => entityId(ancestor.lifecycle[0]) === id
        );
        expect(foundAncestor).not.toBeUndefined();
      });
      expect(tree.render().ancestry.nextAncestor).toEqual('hello');
    });
  });

  describe('related events', () => {
    it('adds related events to the tree', () => {
      const root = generator.generateEvent();
      const events: ResolverRelatedEvents = {
        id: root.process.entity_id,
        events: Array.from(generator.relatedEventsGenerator(root)),
        nextEvent: null,
      };
      const tree = new Tree(root.process.entity_id, { relatedEvents: events });
      const rendered = tree.render();
      expect(rendered.relatedEvents.nextEvent).toBeNull();
      expect(rendered.relatedEvents.events).toStrictEqual(events.events);
    });
  });

  describe('children', () => {
    const root = generator.generateEvent();

    it('adds children all at once', () => {
      const children = Array.from(generator.descendantsTreeGenerator(root, 3, 3, 0, 0, 0));
      // this represents the aggregation returned from elastic search
      // each node in the tree should have 3 children, so if these values are greater than 3 there should be
      // pagination cursors created for those children
      const totals = {
        [root.process.entity_id]: 10,
        [children[0].process.entity_id]: 4,
        [children[1].process.entity_id]: 1,
      };
      const cache: Map<string, ChildNode> = new Map();
      cache.set(root.process.entity_id, createChild(root.process.entity_id));
      Fetcher.addChildrenToCache(cache, totals, children);

      // we added the root at the top of the test
      const rootNode = cache.get(root.process.entity_id)!;
      cache.delete(root.process.entity_id);
      const resolverChildren = {
        childNodes: Array.from(cache.values()),
        nextChild: rootNode.nextChild,
      };

      const tree = new Tree(root.process.entity_id, { children: resolverChildren }).render();
      expect(tree.children.nextChild).not.toBeNull();
      expect(tree.children.childNodes[0].nextChild).not.toBeNull();
      expect(tree.children.childNodes[1].nextChild).toBeNull();
    });
  });
});
