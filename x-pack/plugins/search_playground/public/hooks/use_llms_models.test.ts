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
  { id: 'connectorId1', name: 'OpenAI Connector', type: LLMs.openai },
  { id: 'connectorId2', name: 'OpenAI Azure Connector', type: LLMs.openai_azure },
  { id: 'connectorId2', name: 'Bedrock Connector', type: LLMs.bedrock },
  { id: 'connectorId3', name: 'OpenAI OSS Model Connector', type: LLMs.openai_other },
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
        connectorName: 'OpenAI Connector',
        connectorType: LLMs.openai,
        disabled: false,
        icon: expect.any(Function),
        id: 'connectorId1OpenAI GPT-4o ',
        name: 'OpenAI GPT-4o ',
        showConnectorName: false,
        value: 'gpt-4o',
        promptTokenLimit: 128000,
      },
      {
        connectorId: 'connectorId1',
        connectorName: 'OpenAI Connector',
        connectorType: LLMs.openai,
        disabled: false,
        icon: expect.any(Function),
        id: 'connectorId1OpenAI GPT-4 Turbo ',
        name: 'OpenAI GPT-4 Turbo ',
        showConnectorName: false,
        value: 'gpt-4-turbo',
        promptTokenLimit: 128000,
      },
      {
        connectorId: 'connectorId1',
        connectorName: 'OpenAI Connector',
        connectorType: LLMs.openai,
        disabled: false,
        icon: expect.any(Function),
        id: 'connectorId1OpenAI GPT-3.5 Turbo ',
        name: 'OpenAI GPT-3.5 Turbo ',
        showConnectorName: false,
        value: 'gpt-3.5-turbo',
        promptTokenLimit: 16385,
      },
      {
        connectorId: 'connectorId2',
        connectorName: 'OpenAI Azure Connector',
        connectorType: LLMs.openai_azure,
        disabled: false,
        icon: expect.any(Function),
        id: 'connectorId2OpenAI Azure Connector (Azure OpenAI)',
        name: 'OpenAI Azure Connector (Azure OpenAI)',
        showConnectorName: false,
        value: undefined,
        promptTokenLimit: undefined,
      },
      {
        connectorId: 'connectorId2',
        connectorName: 'Bedrock Connector',
        connectorType: LLMs.bedrock,
        disabled: false,
        icon: expect.any(Function),
        id: 'connectorId2Anthropic Claude 3 Haiku',
        name: 'Anthropic Claude 3 Haiku',
        showConnectorName: false,
        value: 'anthropic.claude-3-haiku-20240307-v1:0',
        promptTokenLimit: 200000,
      },
      {
        connectorId: 'connectorId2',
        connectorName: 'Bedrock Connector',
        connectorType: LLMs.bedrock,
        disabled: false,
        icon: expect.any(Function),
        id: 'connectorId2Anthropic Claude 3.5 Sonnet',
        name: 'Anthropic Claude 3.5 Sonnet',
        showConnectorName: false,
        value: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
        promptTokenLimit: 200000,
      },
      {
        connectorId: 'connectorId3',
        connectorName: 'OpenAI OSS Model Connector',
        connectorType: LLMs.openai_other,
        disabled: false,
        icon: expect.any(Function),
        id: 'connectorId3OpenAI OSS Model Connector (OpenAI Compatible Service)',
        name: 'OpenAI OSS Model Connector (OpenAI Compatible Service)',
        showConnectorName: false,
        value: undefined,
        promptTokenLimit: undefined,
      },
    ]);
  });

  it('returns emptyd when connectors not available', () => {
    mockUseLoadConnectors([]);

    const { result } = renderHook(() => useLLMsModels());

    expect(result.current).toEqual([]);
  });
});
