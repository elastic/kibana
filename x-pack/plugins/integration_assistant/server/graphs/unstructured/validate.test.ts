/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FakeLLM } from '@langchain/core/utils/testing';
import { handleUnstructuredValidate } from './validate';
import type { UnstructuredLogState } from '../../types';
import {
  unstructuredLogState,
  unstructuredLogResponse,
} from '../../../__jest__/fixtures/unstructured';
import {
  ActionsClientChatOpenAI,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server/language_models';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

const model = new FakeLLM({
  response: JSON.stringify(unstructuredLogResponse, null, 2),
}) as unknown as ActionsClientChatOpenAI | ActionsClientSimpleChatModel;

const state: UnstructuredLogState = unstructuredLogState;

describe('Testing unstructured validation without errors', () => {
  const client = {
    asCurrentUser: {
      ingest: {
        simulate: jest.fn().mockReturnValue({
          docs: [
            {
              doc: {
                _source: { testPackage: { testDatastream: { message: 'dummy data' } } },
              },
            },
          ],
        }),
      },
    },
  } as unknown as IScopedClusterClient;

  it('handleUnstructuredValidate() without errors', async () => {
    const response = await handleUnstructuredValidate({ state, model, client });
    expect(response.jsonSamples).toStrictEqual(unstructuredLogState.jsonSamples);
    expect(response.additionalProcessors).toStrictEqual([
      {
        grok: {
          field: 'message',
          patterns: unstructuredLogState.grokPatterns,
          tag: 'grok_header_pattern',
        },
      },
    ]);
    expect(response.errors).toStrictEqual([]);
    expect(response.lastExecutedChain).toBe('unstructuredValidate');
  });
});

describe('Testing unstructured validation errors', () => {
  const client = {
    asCurrentUser: {
      ingest: {
        simulate: jest
          .fn()
          .mockReturnValue({ docs: [{ doc: { _source: { error: 'some error' } } }] }),
      },
    },
  } as unknown as IScopedClusterClient;

  it('handleUnstructuredValidate() errors', async () => {
    const response = await handleUnstructuredValidate({ state, model, client });
    expect(response.errors).toStrictEqual(['some error']);
    expect(response.lastExecutedChain).toBe('unstructuredValidate');
  });
});
