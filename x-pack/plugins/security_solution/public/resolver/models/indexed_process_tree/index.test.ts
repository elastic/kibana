/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResolverNode } from '../../../../common/endpoint/types';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import { generateTree, genResolverNode } from '../../mocks/generator';
import { IndexedProcessTree } from '../../types';
import { factory } from '.';

describe('factory', () => {
  const originID = 'origin';
  let tree: IndexedProcessTree;
  let generator: EndpointDocGenerator;
  beforeEach(() => {
    generator = new EndpointDocGenerator('resolver');
  });

  describe('graph with an undefined originID', () => {
    beforeEach(() => {
      const generatedTreeMetadata = generateTree({
        ancestors: 5,
        generations: 2,
        children: 2,
      });
      tree = factory(generatedTreeMetadata.formattedTree.nodes, undefined);
    });

    it('sets ancestors, descendants, and generations to undefined', () => {
      expect(tree.ancestors).toBeUndefined();
      expect(tree.descendants).toBeUndefined();
      expect(tree.generations).toBeUndefined();
    });
  });

  describe('graph with 10 ancestors', () => {
    beforeEach(() => {
      const generatedTreeMetadata = generateTree({
        // the ancestors value here does not include the origin
        ancestors: 9,
      });
      tree = factory(
        generatedTreeMetadata.formattedTree.nodes,
        generatedTreeMetadata.generatedTree.origin.id
      );
    });

    it('returns 10 ancestors', () => {
      expect(tree.ancestors).toBe(10);
    });
  });

  describe('graph with 3 generations and 7 descendants and weighted on the left', () => {
    let origin: ResolverNode;
    let a: ResolverNode;
    let b: ResolverNode;
    let c: ResolverNode;
    let d: ResolverNode;
    let e: ResolverNode;
    let f: ResolverNode;
    let g: ResolverNode;
    beforeEach(() => {
      /**
       * Build a tree that looks like this
       *  .
          └── origin
              ├── a
              ├── b
              │   └── d
              └── c
                  ├── e
                  └── f
                      └── g
       */

      origin = genResolverNode(generator, { entityID: originID });
      a = genResolverNode(generator, { entityID: 'a', parentEntityID: String(origin.id) });
      b = genResolverNode(generator, { entityID: 'b', parentEntityID: String(origin.id) });
      d = genResolverNode(generator, { entityID: 'd', parentEntityID: String(b.id) });
      c = genResolverNode(generator, { entityID: 'c', parentEntityID: String(origin.id) });
      e = genResolverNode(generator, { entityID: 'e', parentEntityID: String(c.id) });
      f = genResolverNode(generator, { entityID: 'f', parentEntityID: String(c.id) });
      g = genResolverNode(generator, { entityID: 'g', parentEntityID: String(f.id) });
      tree = factory([origin, a, b, c, d, e, f, g], originID);
    });

    it('returns 3 generations, 7 descendants, 1 ancestors', () => {
      expect(tree.generations).toBe(3);
      expect(tree.descendants).toBe(7);
      expect(tree.ancestors).toBe(1);
    });

    it('returns the origin for the originID', () => {
      expect(tree.originID).toBe(originID);
    });

    it('constructs the idToChildren map correctly', () => {
      // the idToChildren only has ids for the parents, there are 4 obvious parents and 1 parent to the origin
      // that would be a key of undefined, so 5 total.
      expect(tree.idToChildren.size).toBe(5);
      expect(tree.idToChildren.get('c')).toEqual([e, f]);
      expect(tree.idToChildren.get('b')).toEqual([d]);
      expect(tree.idToChildren.get('origin')).toEqual([a, b, c]);
      expect(tree.idToChildren.get('f')).toEqual([g]);
      expect(tree.idToChildren.get('g')).toEqual(undefined);
    });

    it('constructs the idToNode map correctly', () => {
      expect(tree.idToNode.size).toBe(8);
      expect(tree.idToNode.get('origin')).toBe(origin);
      expect(tree.idToNode.get('g')).toBe(g);
    });
  });
});
