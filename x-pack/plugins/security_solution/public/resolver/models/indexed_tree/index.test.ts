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

describe('indexed tree when representing a process tree', () => {
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
  describe(`when representing a tree with a single node ('root')`, () => {
    let tree: IndexedTree;
    beforeEach(() => {
      const iterable: Iterable<SafeResolverEvent> = [
        {
          process: {
            entity_id: 'root',
          },
        },
      ];
      tree = IndexedTree.fromIterable(iterable, processTreeNodes, processTreeEdges)!;
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
