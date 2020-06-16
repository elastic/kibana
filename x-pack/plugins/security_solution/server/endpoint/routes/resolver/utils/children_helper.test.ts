/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';

import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';
import { ChildrenNodesHelper } from './children_helper';
import { eventId, entityId, parentEntityId } from '../../../../../common/endpoint/models/event';
import { ResolverEvent, ResolverChildren } from '../../../../../common/endpoint/types';

function findParents(events: ResolverEvent[]): ResolverEvent[] {
  const cache = _.groupBy(events, entityId);

  const parents: ResolverEvent[] = [];
  Object.values(cache).forEach((lifecycle) => {
    const parentNode = cache[parentEntityId(lifecycle[0])!];
    if (parentNode) {
      parents.push(parentNode[0]);
    }
  });
  return parents;
}

function findNode(tree: ResolverChildren, id: string) {
  return tree.childNodes.find((node) => {
    return node.entityID === id;
  });
}

describe('Children helper', () => {
  const generator = new EndpointDocGenerator();
  const root = generator.generateEvent();

  it('builds the children response structure', () => {
    const children = Array.from(generator.descendantsTreeGenerator(root, 3, 3, 0, 0, 0, 100, true));

    // because we requested the generator to always return the max children, there will always be at least 2 parents
    const parents = findParents(children);

    // this represents the aggregation returned from elastic search
    // each node in the tree should have 3 children, so if these values are greater than 3 there should be
    // pagination cursors created for those children
    const totals = {
      [root.process.entity_id]: 100,
      [entityId(parents[0])]: 10,
      [entityId(parents[1])]: 0,
    };

    const helper = new ChildrenNodesHelper(root.process.entity_id);
    helper.addChildren(totals, children);
    const tree = helper.getNodes();
    expect(tree.nextChild).not.toBeNull();

    let parent = findNode(tree, entityId(parents[0]));
    expect(parent?.nextChild).not.toBeNull();
    parent = findNode(tree, entityId(parents[1]));
    expect(parent?.nextChild).toBeNull();

    tree.childNodes.forEach((node) => {
      node.lifecycle.forEach((event) => {
        expect(children.find((child) => child.event.id === eventId(event))).toEqual(event);
      });
    });
  });

  it('builds the children response structure twice', () => {
    const children = Array.from(generator.descendantsTreeGenerator(root, 3, 3, 0, 0, 100));
    const helper = new ChildrenNodesHelper(root.process.entity_id);
    helper.addChildren({}, children);
    helper.getNodes();

    const tree = helper.getNodes();
    tree.childNodes.forEach((node) => {
      node.lifecycle.forEach((event) => {
        expect(children.find((child) => child.event.id === eventId(event))).toEqual(event);
      });
    });
  });
});
