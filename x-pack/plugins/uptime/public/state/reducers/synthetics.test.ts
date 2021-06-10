/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  fetchBlocksAction,
  putBlocksAction,
  syntheticsReducer,
  SyntheticsReducerState,
} from './synthetics';

describe('syntheticsReducer', () => {
  describe('fetch blocks', () => {
    it('sets targeted blocks as pending', () => {
      const state = { blocks: {} };
      const action = fetchBlocksAction(['123', '234']);
      expect(syntheticsReducer(state, action)).toMatchInlineSnapshot(`
        Object {
          "blocks": Object {
            "123": Object {
              "isPending": true,
            },
            "234": Object {
              "isPending": true,
            },
          },
        }
      `);
    });

    it('will not overwrite a cached block', () => {
      const state = { blocks: { '123': { id: '123', blob: 'large', blob_mime: 'image/jpep;' } } };
      const action = fetchBlocksAction(['123']);
      expect(syntheticsReducer(state, action)).toMatchInlineSnapshot(`
        Object {
          "blocks": Object {
            "123": Object {
              "blob": "large",
              "blob_mime": "image/jpep;",
              "id": "123",
            },
          },
        }
      `);
    });
  });
  describe('put blocks', () => {
    let state: SyntheticsReducerState;

    beforeEach(() => {
      state = {
        blocks: {
          '123': {
            isPending: true,
          },
        },
      };
    });

    it('resolves pending blocks', () => {
      const action = putBlocksAction({
        blocks: [
          {
            id: '123',
            synthetics: {
              blob: 'reallybig',
              blob_mime: 'image/jpeg',
            },
          },
        ],
      });
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
              blob_mime: 'image/jpeg',
            },
          },
        ],
      });
      expect(syntheticsReducer(state, action)).toMatchInlineSnapshot(`
        Object {
          "blocks": Object {
            "123": Object {
              "isPending": true,
            },
            "234": Object {
              "id": "234",
              "synthetics": Object {
                "blob": "also big",
                "blob_mime": "image/jpeg",
              },
            },
          },
        }
      `);
    });
  });
});
