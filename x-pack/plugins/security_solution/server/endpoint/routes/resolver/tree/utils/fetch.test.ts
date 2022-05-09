/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Fetcher,
  getAncestryAsArray,
  getIDField,
  getLeafNodes,
  getNameField,
  getParentField,
  TreeOptions,
} from './fetch';
import { LifecycleQuery } from '../queries/lifecycle';
import { DescendantsQuery } from '../queries/descendants';
import { StatsQuery } from '../queries/stats';
import { IScopedClusterClient } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import {
  FieldsObject,
  ResolverNode,
  ResolverSchema,
} from '../../../../../../common/endpoint/types';

jest.mock('../queries/descendants');
jest.mock('../queries/lifecycle');
jest.mock('../queries/stats');

function formatResponse(results: FieldsObject[], schema: ResolverSchema): ResolverNode[] {
  return results.map((node) => {
    return {
      id: getIDField(node, schema) ?? '',
      parent: getParentField(node, schema),
      name: getNameField(node, schema),
      data: node,
      stats: {
        total: 0,
        byCategory: {},
      },
    };
  });
}

describe('fetcher test', () => {
  const schemaIDParent = {
    id: 'id',
    parent: 'parent',
  };

  const schemaIDParentAncestry = {
    id: 'id',
    parent: 'parent',
    ancestry: 'ancestry',
  };

  const schemaIDParentName = {
    id: 'id',
    parent: 'parent',
    name: 'name',
  };

  let client: jest.Mocked<IScopedClusterClient>;
  beforeAll(() => {
    StatsQuery.prototype.search = jest.fn().mockImplementation(async () => {
      return {};
    });
  });
  beforeEach(() => {
    client = elasticsearchServiceMock.createScopedClusterClient();
  });

  describe('descendants', () => {
    it('correctly exists loop when the search returns no results', async () => {
      DescendantsQuery.prototype.search = jest.fn().mockImplementationOnce(async () => {
        return [];
      });
      const options: TreeOptions = {
        descendantLevels: 1,
        descendants: 5,
        ancestors: 0,
        timeRange: {
          from: '',
          to: '',
        },
        schema: {
          id: '',
          parent: '',
        },
        indexPatterns: [''],
        nodes: ['a'],
      };
      const fetcher = new Fetcher(client);
      expect(await fetcher.tree(options)).toEqual([]);
    });

    it('exists the loop when the options specify no descendants', async () => {
      const options: TreeOptions = {
        descendantLevels: 0,
        descendants: 0,
        ancestors: 0,
        timeRange: {
          from: '',
          to: '',
        },
        schema: {
          id: '',
          parent: '',
        },
        indexPatterns: [''],
        nodes: ['a'],
      };

      const fetcher = new Fetcher(client);
      expect(await fetcher.tree(options)).toEqual([]);
    });

    it('returns the correct results without the ancestry defined', async () => {
      /**
        .
        └── 0
            ├── 1
            │   └── 2
            └── 3
                ├── 4
                └── 5
        */
      const level1 = [
        {
          id: '1',
          parent: '0',
        },
        {
          id: '3',
          parent: '0',
        },
      ];
      const level2 = [
        {
          id: '2',
          parent: '1',
        },

        {
          id: '4',
          parent: '3',
        },
        {
          id: '5',
          parent: '3',
        },
      ];
      DescendantsQuery.prototype.search = jest
        .fn()
        .mockImplementationOnce(async () => {
          return level1;
        })
        .mockImplementationOnce(async () => {
          return level2;
        });
      const options: TreeOptions = {
        descendantLevels: 2,
        descendants: 5,
        ancestors: 0,
        timeRange: {
          from: '',
          to: '',
        },
        schema: schemaIDParent,
        indexPatterns: [''],
        nodes: ['0'],
      };

      const fetcher = new Fetcher(client);
      expect(await fetcher.tree(options)).toEqual(
        formatResponse([...level1, ...level2], schemaIDParent)
      );
    });
  });

  describe('ancestors', () => {
    it('correctly exits loop when the search returns no results', async () => {
      LifecycleQuery.prototype.search = jest.fn().mockImplementationOnce(async () => {
        return [];
      });
      const options: TreeOptions = {
        descendantLevels: 0,
        descendants: 0,
        ancestors: 5,
        timeRange: {
          from: '',
          to: '',
        },
        schema: {
          id: '',
          parent: '',
        },
        indexPatterns: [''],
        nodes: ['a'],
      };
      const fetcher = new Fetcher(client);
      expect(await fetcher.tree(options)).toEqual([]);
    });

    it('correctly exits loop when the options specify no ancestors', async () => {
      LifecycleQuery.prototype.search = jest.fn().mockImplementationOnce(async () => {
        throw new Error('should not have called this');
      });
      const options: TreeOptions = {
        descendantLevels: 0,
        descendants: 0,
        ancestors: 0,
        timeRange: {
          from: '',
          to: '',
        },
        schema: {
          id: '',
          parent: '',
        },
        indexPatterns: [''],
        nodes: ['a'],
      };
      const fetcher = new Fetcher(client);
      expect(await fetcher.tree(options)).toEqual([]);
    });

    it('correctly returns the ancestors when the number of levels has been reached', async () => {
      LifecycleQuery.prototype.search = jest
        .fn()
        .mockImplementationOnce(async () => {
          return [
            {
              id: '3',
              parent: '2',
            },
          ];
        })
        .mockImplementationOnce(async () => {
          return [
            {
              id: '2',
              parent: '1',
            },
          ];
        });
      const options: TreeOptions = {
        descendantLevels: 0,
        descendants: 0,
        ancestors: 2,
        timeRange: {
          from: '',
          to: '',
        },
        schema: schemaIDParent,
        indexPatterns: [''],
        nodes: ['3'],
      };
      const fetcher = new Fetcher(client);
      expect(await fetcher.tree(options)).toEqual(
        formatResponse(
          [
            { id: '3', parent: '2' },
            { id: '2', parent: '1' },
          ],
          schemaIDParent
        )
      );
    });

    it('correctly adds name field to response', async () => {
      LifecycleQuery.prototype.search = jest
        .fn()
        .mockImplementationOnce(async () => {
          return [
            {
              id: '3',
              parent: '2',
            },
          ];
        })
        .mockImplementationOnce(async () => {
          return [
            {
              id: '2',
              parent: '1',
            },
          ];
        });
      const options: TreeOptions = {
        descendantLevels: 0,
        descendants: 0,
        ancestors: 2,
        timeRange: {
          from: '',
          to: '',
        },
        schema: schemaIDParentName,
        indexPatterns: [''],
        nodes: ['3'],
      };
      const fetcher = new Fetcher(client);
      expect(await fetcher.tree(options)).toEqual(
        formatResponse(
          [
            { id: '3', parent: '2' },
            { id: '2', parent: '1' },
          ],
          schemaIDParentName
        )
      );
    });

    it('correctly returns the ancestors with ancestry arrays', async () => {
      const node3 = {
        ancestry: ['2', '1'],
        id: '3',
        parent: '2',
      };

      const node1 = {
        ancestry: ['0'],
        id: '1',
        parent: '0',
      };

      const node2 = {
        ancestry: ['1', '0'],
        id: '2',
        parent: '1',
      };
      LifecycleQuery.prototype.search = jest
        .fn()
        .mockImplementationOnce(async () => {
          return [node3];
        })
        .mockImplementationOnce(async () => {
          return [node1, node2];
        });
      const options: TreeOptions = {
        descendantLevels: 0,
        descendants: 0,
        ancestors: 3,
        timeRange: {
          from: '',
          to: '',
        },
        schema: schemaIDParentAncestry,
        indexPatterns: [''],
        nodes: ['3'],
      };
      const fetcher = new Fetcher(client);
      expect(await fetcher.tree(options)).toEqual(
        formatResponse([node3, node1, node2], schemaIDParentAncestry)
      );
    });
  });

  describe('retrieving leaf nodes', () => {
    it('correctly identifies the leaf nodes in a response without the ancestry field', () => {
      /**
        .
        └── 0
            ├── 1
            ├── 2
            └── 3
       */
      const results = [
        {
          id: '1',
          parent: '0',
        },
        {
          id: '2',
          parent: '0',
        },
        {
          id: '3',
          parent: '0',
        },
      ];
      const leaves = getLeafNodes(results, ['0'], { id: 'id', parent: 'parent' });
      expect(leaves).toStrictEqual(['1', '2', '3']);
    });

    it('correctly ignores nodes without the proper fields', () => {
      /**
        .
        └── 0
            ├── 1
            ├── 2
       */
      const results = [
        {
          id: '1',
          parent: '0',
        },
        {
          id: '2',
          parent: '0',
        },
        {
          idNotReal: '3',
          parentNotReal: '0',
        },
      ];
      const leaves = getLeafNodes(results, ['0'], { id: 'id', parent: 'parent' });
      expect(leaves).toStrictEqual(['1', '2']);
    });

    it('returns an empty response when the proper fields are not defined', () => {
      const results = [
        {
          id: '1',
          parentNotReal: '0',
        },
        {
          id: '2',
          parentNotReal: '0',
        },
        {
          idNotReal: '3',
          parent: '0',
        },
      ];
      const leaves = getLeafNodes(results, ['0'], { id: 'id', parent: 'parent' });
      expect(leaves).toStrictEqual([]);
    });

    describe('with the ancestry field defined', () => {
      it('correctly identifies the leaf nodes in a response with the ancestry field', () => {
        /**
          .
          ├── 1
          │   └── 2
          └── 3
         */
        const results = [
          {
            id: '1',
            parent: '0',
            ancestry: ['0', 'a'],
          },
          {
            id: '2',
            parent: '1',
            ancestry: ['1', '0'],
          },
          {
            id: '3',
            parent: '0',
            ancestry: ['0', 'a'],
          },
        ];
        const leaves = getLeafNodes(results, ['0'], {
          id: 'id',
          parent: 'parent',
          ancestry: 'ancestry',
        });
        expect(leaves).toStrictEqual(['2']);
      });

      it('falls back to using parent field if it cannot find the ancestry field', () => {
        /**
          .
          ├── 1
          │   └── 2
          └── 3
         */
        const results = [
          {
            id: '1',
            parent: '0',
            ancestryNotValid: ['0', 'a'],
          },
          {
            id: '2',
            parent: '1',
          },
          {
            id: '3',
            parent: '0',
          },
        ];
        const leaves = getLeafNodes(results, ['0'], {
          id: 'id',
          parent: 'parent',
          ancestry: 'ancestry',
        });
        expect(leaves).toStrictEqual(['1', '3']);
      });

      it('correctly identifies the leaf nodes with a tree with multiple leaves', () => {
        /**
          .
          └── 0
              ├── 1
              │   └── 2
              └── 3
                  ├── 4
                  └── 5
         */
        const results = [
          {
            id: '1',
            parent: '0',
            ancestry: ['0', 'a'],
          },
          {
            id: '2',
            parent: '1',
            ancestry: ['1', '0'],
          },
          {
            id: '3',
            parent: '0',
            ancestry: ['0', 'a'],
          },
          {
            id: '4',
            parent: '3',
            ancestry: ['3', '0'],
          },
          {
            id: '5',
            parent: '3',
            ancestry: ['3', '0'],
          },
        ];
        const leaves = getLeafNodes(results, ['0'], {
          id: 'id',
          parent: 'parent',
          ancestry: 'ancestry',
        });
        expect(leaves).toStrictEqual(['2', '4', '5']);
      });

      it('correctly identifies the leaf nodes with multiple queried nodes', () => {
        /**
          .
          ├── 0
          │   ├── 1
          │   │   └── 2
          │   └── 3
          │       ├── 4
          │       └── 5
          └── a
              └── b
                  ├── c
                  └── d
         */
        const results = [
          {
            id: '1',
            parent: '0',
            ancestry: ['0'],
          },
          {
            id: '2',
            parent: '1',
            ancestry: ['1', '0'],
          },
          {
            id: '3',
            parent: '0',
            ancestry: ['0'],
          },
          {
            id: '4',
            parent: '3',
            ancestry: ['3', '0'],
          },
          {
            id: '5',
            parent: '3',
            ancestry: ['3', '0'],
          },
          {
            id: 'b',
            parent: 'a',
            ancestry: ['a'],
          },
          {
            id: 'c',
            parent: 'b',
            ancestry: ['b', 'a'],
          },
          {
            id: 'd',
            parent: 'b',
            ancestry: ['b', 'a'],
          },
        ];
        const leaves = getLeafNodes(results, ['0', 'a'], {
          id: 'id',
          parent: 'parent',
          ancestry: 'ancestry',
        });
        expect(leaves).toStrictEqual(['2', '4', '5', 'c', 'd']);
      });

      it('correctly identifies the leaf nodes with an unbalanced tree', () => {
        /**
          .
          ├── 0
          │   ├── 1
          │   │   └── 2
          │   └── 3
          │       ├── 4
          │       └── 5
          └── a
              └── b
         */
        const results = [
          {
            id: '1',
            parent: '0',
            ancestry: ['0'],
          },
          {
            id: '2',
            parent: '1',
            ancestry: ['1', '0'],
          },
          {
            id: '3',
            parent: '0',
            ancestry: ['0'],
          },
          {
            id: '4',
            parent: '3',
            ancestry: ['3', '0'],
          },
          {
            id: '5',
            parent: '3',
            ancestry: ['3', '0'],
          },
          {
            id: 'b',
            parent: 'a',
            ancestry: ['a'],
          },
        ];
        const leaves = getLeafNodes(results, ['0', 'a'], {
          id: 'id',
          parent: 'parent',
          ancestry: 'ancestry',
        });
        // the reason b is not identified here is because the ancestry array
        // size is 2, which means that if b had a descendant, then it would have been found
        // using our query which found 2, 4, 5. So either we hit the size limit or there are no
        // children of b
        expect(leaves).toStrictEqual(['2', '4', '5']);
      });
    });
  });

  describe('getIDField', () => {
    it('returns undefined if the field does not exist', () => {
      expect(getIDField({}, { id: 'a', parent: 'b' })).toBeUndefined();
    });

    it('returns the first value if the field is an array', () => {
      expect(getIDField({ 'a.b': ['1', '2'] }, { id: 'a.b', parent: 'b' })).toStrictEqual('1');
    });
  });

  describe('getParentField', () => {
    it('returns undefined if the field does not exist', () => {
      expect(getParentField({}, { id: 'a', parent: 'b' })).toBeUndefined();
    });

    it('returns the first value if the field is an array', () => {
      expect(getParentField({ 'a.b': ['1', '2'] }, { id: 'z', parent: 'a.b' })).toStrictEqual('1');
    });
  });

  describe('getAncestryAsArray', () => {
    it('returns an empty array if the field does not exist', () => {
      expect(getAncestryAsArray({}, { id: 'a', parent: 'b', ancestry: 'z' })).toStrictEqual([]);
    });

    it('returns the full array if the field exists', () => {
      expect(
        getAncestryAsArray({ 'a.b': ['1', '2'] }, { id: 'z', parent: 'f', ancestry: 'a.b' })
      ).toStrictEqual(['1', '2']);
    });

    it('returns a built array using the parent field if ancestry field is empty', () => {
      expect(
        getAncestryAsArray(
          { 'aParent.bParent': ['1', '2'], ancestry: [] },
          { id: 'z', parent: 'aParent.bParent', ancestry: 'ancestry' }
        )
      ).toStrictEqual(['1']);
    });

    it('returns a built array using the parent field if ancestry field does not exist', () => {
      expect(
        getAncestryAsArray(
          { 'aParent.bParent': '1' },
          { id: 'z', parent: 'aParent.bParent', ancestry: 'ancestry' }
        )
      ).toStrictEqual(['1']);
    });
  });
});
