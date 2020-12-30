/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';
import { Tree } from './tree';
import { SafeResolverAncestry, SafeResolverEvent } from '../../../../../common/endpoint/types';
import { entityIDSafeVersion } from '../../../../../common/endpoint/models/event';

describe('Tree', () => {
  const generator = new EndpointDocGenerator();

  describe('ancestry', () => {
    // transform the generator's array of events into the format expected by the tree class
    const ancestorInfo: SafeResolverAncestry = {
      ancestors: generator
        .createAlertEventAncestry({ ancestors: 5, percentTerminated: 0, percentWithRelated: 0 })
        .filter((event) => {
          return event.event?.kind === 'event';
        })
        .map((event) => {
          return {
            entityID: entityIDSafeVersion(event) ?? '',
            // The generator returns Events, but the tree needs a ResolverEvent
            lifecycle: [event as SafeResolverEvent],
          };
        }),
      nextAncestor: 'hello',
    };

    it('adds ancestors to the tree', () => {
      const tree = new Tree(ancestorInfo.ancestors[0].entityID, { ancestry: ancestorInfo });
      const ids = tree.ids();
      ids.forEach((id) => {
        const foundAncestor = ancestorInfo.ancestors.find(
          (ancestor) => entityIDSafeVersion(ancestor.lifecycle[0]) === id
        );
        expect(foundAncestor).not.toBeUndefined();
      });
      expect(tree.render().ancestry.nextAncestor).toEqual('hello');
    });
  });
});
