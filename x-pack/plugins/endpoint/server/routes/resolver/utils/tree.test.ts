/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EndpointDocGenerator } from '../../../../common/generate_data';
import { Tree } from './tree';
import { AncestorEvents, ResolverEvent, RelatedEvents } from '../../../../common/types';
import { entityId } from '../../../../common/models/event';

describe('Tree', () => {
  const generator = new EndpointDocGenerator();

  describe('ancestry', () => {
    // transform the generator's array of events into the format expected by the tree class
    const ancestorInfo: AncestorEvents = {
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

    it('throws an error if the root node already has lifecycle events', () => {
      const tree = new Tree(ancestorInfo.ancestors[0].id);
      tree.addAncestors(ancestorInfo);
      expect(() => {
        tree.addAncestors(ancestorInfo);
      }).toThrow();
    });

    it('adds ancestors to the tree', () => {
      const tree = new Tree(ancestorInfo.ancestors[0].id);
      tree.addAncestors(ancestorInfo);
      const ids = tree.ids();
      ids.forEach(id => {
        const foundAncestor = ancestorInfo.ancestors.find(
          ancestor => entityId(ancestor.lifecycle[0]) === id
        );
        expect(foundAncestor).not.toBeUndefined();
      });
      expect(tree.render().pagination.nextAncestor).toEqual('hello');
    });
  });

  describe('related events', () => {
    it('adds related events to the tree', () => {
      const root = generator.generateEvent();
      const events: RelatedEvents = {
        id: root.process.entity_id,
        events: Array.from(generator.relatedEventsGenerator(root)),
        nextEvent: null,
      };
      const tree = new Tree(root.process.entity_id);
      tree.addEvents(events);
      const rendered = tree.render();
      expect(rendered.pagination.nextEvent).toBeNull();
      expect(rendered.events).toStrictEqual(events.events);
    });
  });

  describe('children', () => {
    const root = generator.generateEvent();

    it('adds children all at once', () => {
      const children = Array.from(generator.descendantsTreeGenerator(root, 3, 3, 0, 0, 0));
    });
  });
});
