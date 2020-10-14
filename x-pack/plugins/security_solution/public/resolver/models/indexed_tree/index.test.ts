/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexedTree } from '.';
import {
  entityIDSafeVersion,
  parentEntityIDSafeVersion,
} from '../../../../common/endpoint/models/event';

import { SafeResolverEvent } from '../../../../common/endpoint/types';

describe('When `IndexedTree.fromIterable` is called with `nodes` and `edges` functions that can build a process tree from ECS events', () => {
  function* processTreeNodes(event: SafeResolverEvent): Iterable<string> {
    const entityID = entityIDSafeVersion(event);
    const parentEntitydID = parentEntityIDSafeVersion(event);
    if (entityID) yield entityID;
    if (parentEntitydID) yield parentEntitydID;
  }
  function* processTreeEdges(event: SafeResolverEvent): Iterable<[string, string]> {
    const entityID = entityIDSafeVersion(event);
    const parentEntitydID = parentEntityIDSafeVersion(event);
    if (entityID && parentEntitydID) yield [parentEntitydID, entityID];
  }
  function iterableWithSingleNode(): Iterable<SafeResolverEvent> {
    return [
      {
        process: {
          entity_id: 'root',
        },
      },
    ];
  }
  describe(`and when the iterable is ${JSON.stringify(iterableWithSingleNode())}`, () => {
    let tree: IndexedTree;
    beforeEach(() => {
      tree = IndexedTree.fromIterable(
        iterableWithSingleNode(),
        processTreeNodes,
        processTreeEdges
      )!;
    });
    it(`should not have any children for 'root'`, () => {
      expect([...tree.children('root')]).toEqual([]);
    });
    it(`should not have a parent for 'root'`, () => {
      expect(tree.parent('root')).toBe(undefined);
    });
    it('should have a size of 1', () => {
      expect(tree.size).toBe(1);
    });
    it(`should have a root of 'root'`, () => {
      expect(tree.root).toBe('root');
    });
    it(`should return just 'root' when traversed in level order`, () => {
      expect([...tree.levelOrder]).toEqual(['root']);
    });
  });
});
