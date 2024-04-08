/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useLoadConnectors } from './use_load_connectors';
import { useLLMsModels } from './use_llms_models';
import { LLMs } from '../types';

jest.mock('./use_load_connectors', () => ({
  useLoadConnectors: jest.fn(),
}));

const mockConnectors = {
  [LLMs.openai]: { id: 'connectorId1', title: 'OpenAI Connector' },
};
const mockUseLoadConnectors = (data: any) => {
  (useLoadConnectors as jest.Mock).mockReturnValue({ data });
};

describe('useLLMsModels Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns LLMModels with connectors available', () => {
    mockUseLoadConnectors(mockConnectors);

    const { result } = renderHook(() => useLLMsModels());

    expect(result.current).toEqual([
      {
        connectorId: undefined,
        disabled: true,
        icon: expect.any(Function),
        name: 'Azure OpenAI',
        value: undefined,
      },
      {
        connectorId: 'connectorId1',
        disabled: false,
        icon: expect.any(Function),
        name: 'gpt-3.5-turbo',
        value: 'gpt-3.5-turbo',
      },
      {
        connectorId: 'connectorId1',
        disabled: false,
        icon: expect.any(Function),
        name: 'gpt-3.5-turbo-1106',
        value: 'gpt-3.5-turbo-1106',
      },
      {
        connectorId: 'connectorId1',
        disabled: false,
        icon: expect.any(Function),
        name: 'gpt-3.5-turbo-16k',
        value: 'gpt-3.5-turbo-16k',
      },
      {
        connectorId: 'connectorId1',
        disabled: false,
        icon: expect.any(Function),
        name: 'gpt-3.5-turbo-16k-0613',
        value: 'gpt-3.5-turbo-16k-0613',
      },
      {
        connectorId: 'connectorId1',
        disabled: false,
        icon: expect.any(Function),
        name: 'gpt-3.5-turbo-instruct',
        value: 'gpt-3.5-turbo-instruct',
      },
    ]);
  });

  it('returns LLMModels as disabled when no connectors are available', () => {
    mockUseLoadConnectors({});

    const { result } = renderHook(() => useLLMsModels());

    expect(result.current).toEqual([
      {
        connectorId: undefined,
        disabled: true,
        icon: expect.any(Function),
        name: 'Azure OpenAI',
        value: undefined,
      },
      {
        connectorId: undefined,
        disabled: true,
        icon: expect.any(Function),
        name: 'gpt-3.5-turbo',
        value: 'gpt-3.5-turbo',
      },
      {
        connectorId: undefined,
        disabled: true,
        icon: expect.any(Function),
        name: 'gpt-3.5-turbo-1106',
        value: 'gpt-3.5-turbo-1106',
      },
      {
        connectorId: undefined,
        disabled: true,
        icon: expect.any(Function),
        name: 'gpt-3.5-turbo-16k',
        value: 'gpt-3.5-turbo-16k',
      },
      {
        connectorId: undefined,
        disabled: true,
        icon: expect.any(Function),
        name: 'gpt-3.5-turbo-16k-0613',
        value: 'gpt-3.5-turbo-16k-0613',
      },
      {
        connectorId: undefined,
        disabled: true,
        icon: expect.any(Function),
        name: 'gpt-3.5-turbo-instruct',
        value: 'gpt-3.5-turbo-instruct',
      },
    ]);
  });
});
