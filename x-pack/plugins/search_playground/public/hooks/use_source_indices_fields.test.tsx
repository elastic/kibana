/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useKibana } from './use_kibana';
import { PlaygroundProvider } from '../providers/playground_provider';
import React from 'react';
import * as ReactHookForm from 'react-hook-form';

jest.mock('./use_kibana', () => ({
  useKibana: jest.fn(),
}));
jest.mock('react-router-dom-v5-compat', () => ({
  useSearchParams: jest.fn(() => [{ get: jest.fn() }]),
}));

let formHookSpy: jest.SpyInstance;

import { useSourceIndicesFields } from './use_source_indices_field';
import { IndicesQuerySourceFields } from '../types';

// Failing: See https://github.com/elastic/kibana/issues/188840
describe.skip('useSourceIndicesFields Hook', () => {
  let postMock: jest.Mock;

  beforeEach(() => {
    // Playground Provider has the formProvider which
    // persists the form state into local storage
    // We need to clear the local storage before each test
    localStorage.clear();
  });

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
            indices: ['newIndex'],
            sparse_vector: true,
          },
        ],
        dense_vector_query_fields: [],
        bm25_query_fields: [],
        source_fields: ['field1'],
        skipped_fields: 0,
        semantic_fields: [],
      },
    };

    postMock = jest.fn().mockResolvedValue(querySourceFields);
    (useKibana as jest.Mock).mockImplementation(() => ({
      services: {
        http: {
          post: postMock,
          get: jest.fn(() => {
            return [];
          }),
        },
      },
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle addIndex correctly changing indices', async () => {
    const { result } = renderHook(() => useSourceIndicesFields(), { wrapper });
    const { getValues } = formHookSpy.mock.results[0].value;

    act(() => {
      expect(result.current.indices).toEqual([]);
      expect(getValues()).toMatchInlineSnapshot(`
        Object {
          "doc_size": 3,
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
          "query_fields": Object {},
          "source_fields": Object {},
          "summarization_model": undefined,
        }
      `);
      result.current.addIndex('newIndex');
    });

    await waitFor(() => null);
    expect(result.current.indices).toEqual(['newIndex']);

    expect(postMock).toHaveBeenCalled();

    await act(async () => {
      expect(getValues()).toMatchInlineSnapshot(`
        Object {
          "doc_size": 3,
          "elasticsearch_query": Object {
            "retriever": Object {
              "standard": Object {
                "query": Object {
                  "sparse_vector": Object {
                    "field": "field1",
                    "inference_id": "model1",
                    "query": "{query}",
                  },
                },
              },
            },
          },
          "indices": Array [
            "newIndex",
          ],
          "prompt": "You are an assistant for question-answering tasks.",
          "query_fields": Object {
            "newIndex": Array [
              "field1",
            ],
          },
          "source_fields": Object {
            "newIndex": Array [
              "field1",
            ],
          },
          "summarization_model": undefined,
        }
      `);
    });
  });
});
