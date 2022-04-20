/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  fetchBlocksAction,
  isPendingBlock,
  pruneCacheAction,
  setBlockLoadingAction,
  putBlocksAction,
  putCacheSize,
  syntheticsReducer,
  SyntheticsReducerState,
  updateHitCountsAction,
} from './synthetics';

const MIME = 'image/jpeg';

describe('syntheticsReducer', () => {
  jest.spyOn(Date, 'now').mockImplementation(() => 10);

  describe('isPendingBlock', () => {
    it('returns true for pending block', () => {
      expect(isPendingBlock({ status: 'pending' })).toBe(true);
    });

    it('returns true for loading block', () => {
      expect(isPendingBlock({ status: 'loading' })).toBe(true);
    });

    it('returns false for non-pending block', () => {
      expect(isPendingBlock({ synthetics: { blob: 'blobdata', blob_mime: MIME } })).toBe(false);
      expect(isPendingBlock({})).toBe(false);
    });
  });

  describe('prune cache', () => {
    let state: SyntheticsReducerState;

    beforeEach(() => {
      const blobs = ['large', 'large2', 'large3', 'large4'];
      state = {
        blocks: {
          '123': {
            synthetics: {
              blob: blobs[0],
              blob_mime: MIME,
            },
            id: '123',
          },
          '234': {
            synthetics: {
              blob: blobs[1],
              blob_mime: MIME,
            },
            id: '234',
          },
          '345': {
            synthetics: {
              blob: blobs[2],
              blob_mime: MIME,
            },
            id: '345',
          },
          '456': {
            synthetics: {
              blob: blobs[3],
              blob_mime: MIME,
            },
            id: '456',
          },
        },
        cacheSize: 23,
        hitCount: [
          { hash: '123', hitTime: 89 },
          { hash: '234', hitTime: 23 },
          { hash: '345', hitTime: 4 },
          { hash: '456', hitTime: 1 },
        ],
      };
    });

    it('removes lowest common hits', () => {
      // @ts-expect-error redux-actions doesn't handle types well
      expect(syntheticsReducer(state, pruneCacheAction(10))).toMatchInlineSnapshot(`
        Object {
          "blocks": Object {
            "123": Object {
              "id": "123",
              "synthetics": Object {
                "blob": "large",
                "blob_mime": "image/jpeg",
              },
            },
            "234": Object {
              "id": "234",
              "synthetics": Object {
                "blob": "large2",
                "blob_mime": "image/jpeg",
              },
            },
          },
          "cacheSize": 11,
          "hitCount": Array [
            Object {
              "hash": "123",
              "hitTime": 89,
            },
            Object {
              "hash": "234",
              "hitTime": 23,
            },
          ],
        }
      `);
    });

    it('skips pending blocks', () => {
      state.blocks = { ...state.blocks, '000': { status: 'pending' } };
      state.hitCount.push({ hash: '000', hitTime: 1 });
      // @ts-expect-error redux-actions doesn't handle types well
      const newState = syntheticsReducer(state, pruneCacheAction(10));
      expect(newState.blocks['000']).toEqual({ status: 'pending' });
    });

    it('ignores a hash from `hitCount` that does not exist', () => {
      state.hitCount.push({ hash: 'not exist', hitTime: 1 });
      // @ts-expect-error redux-actions doesn't handle types well
      expect(syntheticsReducer(state, pruneCacheAction(2))).toMatchInlineSnapshot(`
        Object {
          "blocks": Object {
            "123": Object {
              "id": "123",
              "synthetics": Object {
                "blob": "large",
                "blob_mime": "image/jpeg",
              },
            },
            "234": Object {
              "id": "234",
              "synthetics": Object {
                "blob": "large2",
                "blob_mime": "image/jpeg",
              },
            },
            "345": Object {
              "id": "345",
              "synthetics": Object {
                "blob": "large3",
                "blob_mime": "image/jpeg",
              },
            },
          },
          "cacheSize": 17,
          "hitCount": Array [
            Object {
              "hash": "123",
              "hitTime": 89,
            },
            Object {
              "hash": "234",
              "hitTime": 23,
            },
            Object {
              "hash": "345",
              "hitTime": 4,
            },
          ],
        }
      `);
    });

    it('will prune a block with an empty blob', () => {
      state.blocks = {
        ...state.blocks,
        '000': { id: '000', synthetics: { blob: '', blob_mime: MIME } },
      };
      state.hitCount.push({ hash: '000', hitTime: 1 });
      // @ts-expect-error redux-actions doesn't handle types well
      const newState = syntheticsReducer(state, pruneCacheAction(10));
      expect(Object.keys(newState.blocks)).not.toContain('000');
    });
  });

  describe('fetch blocks', () => {
    it('sets targeted blocks as pending', () => {
      const state: SyntheticsReducerState = { blocks: {}, cacheSize: 0, hitCount: [] };
      const action = fetchBlocksAction(['123', '234']);
      // @ts-expect-error redux-actions doesn't handle types well
      expect(syntheticsReducer(state, action)).toMatchInlineSnapshot(`
        Object {
          "blocks": Object {
            "123": Object {
              "status": "pending",
            },
            "234": Object {
              "status": "pending",
            },
          },
          "cacheSize": 0,
          "hitCount": Array [],
        }
      `);
    });

    it('will not overwrite a cached block', () => {
      const state: SyntheticsReducerState = {
        blocks: { '123': { id: '123', synthetics: { blob: 'large', blob_mime: MIME } } },
        cacheSize: 'large'.length,
        hitCount: [{ hash: '123', hitTime: 1 }],
      };
      const action = fetchBlocksAction(['123']);
      // @ts-expect-error redux-actions doesn't handle types well
      expect(syntheticsReducer(state, action)).toMatchInlineSnapshot(`
        Object {
          "blocks": Object {
            "123": Object {
              "id": "123",
              "synthetics": Object {
                "blob": "large",
                "blob_mime": "image/jpeg",
              },
            },
          },
          "cacheSize": 5,
          "hitCount": Array [
            Object {
              "hash": "123",
              "hitTime": 1,
            },
          ],
        }
      `);
    });
  });
  describe('update hit counts', () => {
    let state: SyntheticsReducerState;

    beforeEach(() => {
      const blobs = ['large', 'large2', 'large3'];
      state = {
        blocks: {
          '123': {
            synthetics: {
              blob: blobs[0],
              blob_mime: MIME,
            },
            id: '123',
          },
          '234': {
            synthetics: {
              blob: blobs[1],
              blob_mime: MIME,
            },
            id: '234',
          },
          '345': {
            synthetics: {
              blob: blobs[2],
              blob_mime: MIME,
            },
            id: '345',
          },
        },
        cacheSize: 17,
        hitCount: [
          { hash: '123', hitTime: 1 },
          { hash: '234', hitTime: 1 },
        ],
      };
    });

    it('increments hit count for selected hashes', () => {
      // @ts-expect-error redux-actions doesn't handle types well
      expect(syntheticsReducer(state, updateHitCountsAction(['123', '234'])).hitCount).toEqual([
        {
          hash: '123',
          hitTime: 10,
        },
        { hash: '234', hitTime: 10 },
      ]);
    });

    it('adds new hit count for missing item', () => {
      // @ts-expect-error redux-actions doesn't handle types well
      expect(syntheticsReducer(state, updateHitCountsAction(['345'])).hitCount).toEqual([
        { hash: '345', hitTime: 10 },
        { hash: '123', hitTime: 1 },
        { hash: '234', hitTime: 1 },
      ]);
    });
  });
  describe('put cache size', () => {
    let state: SyntheticsReducerState;

    beforeEach(() => {
      state = {
        blocks: {},
        cacheSize: 0,
        hitCount: [],
      };
    });

    it('updates the cache size', () => {
      // @ts-expect-error redux-actions doesn't handle types well
      expect(syntheticsReducer(state, putCacheSize(100))).toEqual({
        blocks: {},
        cacheSize: 100,
        hitCount: [],
      });
    });
  });

  describe('in-flight blocks', () => {
    let state: SyntheticsReducerState;

    beforeEach(() => {
      state = {
        blocks: {
          '123': { status: 'pending' },
        },
        cacheSize: 1,
        hitCount: [{ hash: '123', hitTime: 1 }],
      };
    });

    it('sets pending blocks to loading', () => {
      // @ts-expect-error redux-actions doesn't handle types well
      expect(syntheticsReducer(state, setBlockLoadingAction(['123']))).toEqual({
        blocks: { '123': { status: 'loading' } },
        cacheSize: 1,
        hitCount: [{ hash: '123', hitTime: 1 }],
      });
    });
  });

  describe('put blocks', () => {
    let state: SyntheticsReducerState;

    beforeEach(() => {
      state = {
        blocks: {
          '123': {
            status: 'pending',
          },
        },
        cacheSize: 0,
        hitCount: [{ hash: '123', hitTime: 1 }],
      };
    });

    it('resolves pending blocks', () => {
      const action = putBlocksAction({
        blocks: [
          {
            id: '123',
            synthetics: {
              blob: 'reallybig',
              blob_mime: MIME,
            },
          },
        ],
      });
      // @ts-expect-error redux-actions doesn't handle types well
      const result = syntheticsReducer(state, action);
      expect(result).toMatchInlineSnapshot(`
        Object {
          "blocks": Object {
            "123": Object {
              "id": "123",
              "synthetics": Object {
                "blob": "reallybig",
                "blob_mime": "image/jpeg",
              },
            },
          },
          "cacheSize": 0,
          "hitCount": Array [
            Object {
              "hash": "123",
              "hitTime": 1,
            },
          ],
        }
      `);
    });

    it('keeps unresolved blocks', () => {
      const action = putBlocksAction({
        blocks: [
          {
            id: '234',
            synthetics: {
              blob: 'also big',
              blob_mime: MIME,
            },
          },
        ],
      });
      // @ts-expect-error redux-actions doesn't handle types well
      expect(syntheticsReducer(state, action)).toMatchInlineSnapshot(`
        Object {
          "blocks": Object {
            "123": Object {
              "status": "pending",
            },
            "234": Object {
              "id": "234",
              "synthetics": Object {
                "blob": "also big",
                "blob_mime": "image/jpeg",
              },
            },
          },
          "cacheSize": 0,
          "hitCount": Array [
            Object {
              "hash": "123",
              "hitTime": 1,
            },
          ],
        }
      `);
    });
  });
});
