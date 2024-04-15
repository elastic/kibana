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

const mockConnectors = [{ id: 'connectorId1', title: 'OpenAI Connector', type: LLMs.openai }];
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
        disabled: false,
        icon: expect.any(Function),
        id: 'connectorId1gpt-3.5-turbo ',
        name: 'gpt-3.5-turbo ',
        showConnectorName: false,
        value: 'gpt-3.5-turbo',
      },
      {
        connectorId: 'connectorId1',
        disabled: false,
        icon: expect.any(Function),
        id: 'connectorId1gpt-4 ',
        name: 'gpt-4 ',
        showConnectorName: false,
        value: 'gpt-4',
      },
    ]);
  });

  it('returns emptyd when connectors not available', () => {
    mockUseLoadConnectors([]);

    const { result } = renderHook(() => useLLMsModels());

    expect(result.current).toEqual([]);
  });
});
