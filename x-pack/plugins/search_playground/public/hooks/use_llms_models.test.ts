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

const mockConnectors = [
  { id: 'connectorId1', title: 'OpenAI Connector', type: LLMs.openai },
  { id: 'connectorId2', title: 'OpenAI Azure Connector', type: LLMs.openai_azure },
  { id: 'connectorId2', title: 'Bedrock Connector', type: LLMs.bedrock },
];
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
        connectorId: 'connectorId1',
        connectorName: undefined,
        connectorType: LLMs.openai,
        disabled: false,
        icon: expect.any(Function),
        id: 'connectorId1gpt-3.5-turbo ',
        name: 'gpt-3.5-turbo ',
        showConnectorName: false,
        value: 'gpt-3.5-turbo',
        promptTokenLimit: 16385,
      },
      {
        connectorId: 'connectorId1',
        connectorName: undefined,
        connectorType: LLMs.openai,
        disabled: false,
        icon: expect.any(Function),
        id: 'connectorId1gpt-4-turbo ',
        name: 'gpt-4-turbo ',
        showConnectorName: false,
        value: 'gpt-4-turbo',
        promptTokenLimit: 128000,
      },
      {
        connectorId: 'connectorId2',
        connectorName: undefined,
        connectorType: LLMs.openai_azure,
        disabled: false,
        icon: expect.any(Function),
        id: 'connectorId2Azure OpenAI ',
        name: 'Azure OpenAI ',
        showConnectorName: false,
        value: undefined,
        promptTokenLimit: undefined,
      },
      {
        connectorId: 'connectorId2',
        connectorName: undefined,
        connectorType: LLMs.bedrock,
        disabled: false,
        icon: expect.any(Function),
        id: 'connectorId2Claude 3 Haiku',
        name: 'Claude 3 Haiku',
        showConnectorName: false,
        value: 'anthropic.claude-3-haiku-20240307-v1:0',
        promptTokenLimit: 200000,
      },
      {
        connectorId: 'connectorId2',
        connectorName: undefined,
        connectorType: LLMs.bedrock,
        disabled: false,
        icon: expect.any(Function),
        id: 'connectorId2Claude 3 Sonnet',
        name: 'Claude 3 Sonnet',
        showConnectorName: false,
        value: 'anthropic.claude-3-haiku-20240307-v1:0',
        promptTokenLimit: 200000,
      },
    ]);
  });

  it('returns emptyd when connectors not available', () => {
    mockUseLoadConnectors([]);

    const { result } = renderHook(() => useLLMsModels());

    expect(result.current).toEqual([]);
  });
});
