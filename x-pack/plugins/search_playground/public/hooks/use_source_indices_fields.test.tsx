/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useKibana } from './use_kibana';
import { PlaygroundProvider } from '../providers/playground_provider';
import React from 'react';
import * as ReactHookForm from 'react-hook-form';

jest.mock('./use_kibana', () => ({
  useKibana: jest.fn(),
}));

let formHookSpy: jest.SpyInstance;

import { getIndicesWithNoSourceFields, useSourceIndicesFields } from './use_source_indices_field';
import { IndicesQuerySourceFields } from '../types';

// FLAKY: https://github.com/elastic/kibana/issues/181102
describe.skip('useSourceIndicesFields Hook', () => {
  let postMock: jest.Mock;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <PlaygroundProvider>{children}</PlaygroundProvider>
  );

  beforeEach(() => {
    formHookSpy = jest.spyOn(ReactHookForm, 'useForm');
    const querySourceFields: IndicesQuerySourceFields = {
      newIndex: {
        elser_query_fields: [
          {
            field: 'field1',
            model_id: 'model1',
            nested: false,
            indices: ['newIndex'],
          },
        ],
        dense_vector_query_fields: [],
        bm25_query_fields: [],
        source_fields: ['field1'],
        skipped_fields: 0,
      },
    };

    postMock = jest.fn().mockResolvedValue(querySourceFields);
    (useKibana as jest.Mock).mockImplementation(() => ({
      services: {
        http: {
          post: postMock,
        },
      },
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getIndicesWithNoSourceFields', () => {
    it('should return undefined if all indices have source fields', () => {
      const defaultSourceFields = {
        index1: ['field1'],
        index2: ['field2'],
      };
      expect(getIndicesWithNoSourceFields(defaultSourceFields)).toBeUndefined();
    });

    it('should return indices with no source fields', () => {
      const defaultSourceFields = {
        index1: ['field1'],
        index2: [],
      };
      expect(getIndicesWithNoSourceFields(defaultSourceFields)).toBe('index2');
    });
  });

  it('should handle addIndex correctly changing indices and updating loading state', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useSourceIndicesFields(), { wrapper });
    const { getValues } = formHookSpy.mock.results[0].value;

    act(() => {
      expect(result.current.indices).toEqual([]);
      expect(getValues()).toMatchInlineSnapshot(`
        Object {
          "doc_size": 5,
          "elasticsearch_query": Object {},
          "indices": Array [],
          "prompt": "You are an assistant for question-answering tasks.",
          "source_fields": Array [],
        }
      `);
      result.current.addIndex('newIndex');
    });

    await act(async () => {
      await waitForNextUpdate();
      expect(result.current.indices).toEqual(['newIndex']);
      expect(result.current.loading).toBe(true);
    });

    expect(postMock).toHaveBeenCalled();

    await act(async () => {
      expect(result.current.loading).toBe(false);
      expect(getValues()).toMatchInlineSnapshot(`
        Object {
          "doc_size": 5,
          "elasticsearch_query": Object {
            "retriever": Object {
              "standard": Object {
                "query": Object {
                  "text_expansion": Object {
                    "field1": Object {
                      "model_id": "model1",
                      "model_text": "{query}",
                    },
                  },
                },
              },
            },
          },
          "indices": Array [
            "newIndex",
          ],
          "prompt": "You are an assistant for question-answering tasks.",
          "source_fields": Object {
            "newIndex": Array [
              "field1",
            ],
          },
        }
      `);
    });
  });

  it('should provide warning message for adding an index without any fields', async () => {
    const querySourceFields: IndicesQuerySourceFields = {
      missing_fields_index: {
        elser_query_fields: [],
        dense_vector_query_fields: [],
        bm25_query_fields: [],
        source_fields: [],
        skipped_fields: 0,
      },
    };

    postMock.mockResolvedValue(querySourceFields);

    const { result, waitForNextUpdate } = renderHook(() => useSourceIndicesFields(), { wrapper });
    const { getValues } = formHookSpy.mock.results[0].value;

    await act(async () => {
      result.current.addIndex('missing_fields_index');
    });

    await act(async () => {
      await waitForNextUpdate();
    });

    expect(postMock).toHaveBeenCalled();

    await act(async () => {
      expect(result.current.noFieldsIndicesWarning).toEqual('missing_fields_index');
      expect(result.current.loading).toBe(false);
      expect(getValues()).toMatchInlineSnapshot(`
        Object {
          "doc_size": 5,
          "elasticsearch_query": Object {
            "retriever": Object {
              "standard": Object {
                "query": Object {
                  "match_all": Object {},
                },
              },
            },
          },
          "indices": Array [
            "missing_fields_index",
          ],
          "prompt": "You are an assistant for question-answering tasks.",
          "source_fields": Object {
            "missing_fields_index": Array [],
          },
        }
      `);
    });
  });

  it('should not provide any warning message for adding and then removing an index without any fields', async () => {
    const querySourceFields: IndicesQuerySourceFields = {
      missing_fields_index: {
        elser_query_fields: [],
        dense_vector_query_fields: [],
        bm25_query_fields: [],
        source_fields: [],
        skipped_fields: 0,
      },
    };

    postMock.mockResolvedValue(querySourceFields);

    const { result } = renderHook(() => useSourceIndicesFields(), { wrapper });
    const { getValues } = formHookSpy.mock.results[0].value;

    await act(async () => {
      result.current.addIndex('missing_fields_index');
    });

    await act(async () => {
      result.current.removeIndex('missing_fields_index');
    });

    expect(postMock).toHaveBeenCalled();

    await act(async () => {
      expect(result.current.noFieldsIndicesWarning).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(getValues()).toMatchInlineSnapshot(`
        Object {
          "doc_size": 5,
          "elasticsearch_query": Object {
            "retriever": Object {
              "standard": Object {
                "query": Object {
                  "match_all": Object {},
                },
              },
            },
          },
          "indices": Array [],
          "prompt": "You are an assistant for question-answering tasks.",
          "source_fields": Object {
            "missing_fields_index": Array [],
          },
        }
      `);
    });
  });
});
