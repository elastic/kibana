/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useLoadConnectors } from './use_load_connectors';
import { useLLMsModels } from './use_llms_models';
import { LLMs, SummarizationModelName } from '../types';

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

    const expectedModels = Object.values(SummarizationModelName).map((model) => ({
      name: model,
      icon: expect.any(Function),
      disabled: false,
      connectorId: 'connectorId1',
    }));

    expect(result.current).toEqual(expectedModels);
  });

  it('returns LLMModels as disabled when no connectors are available', () => {
    mockUseLoadConnectors({});

    const { result } = renderHook(() => useLLMsModels());

    const expectedModels = Object.values(SummarizationModelName).map((model) => ({
      name: model,
      icon: expect.any(Function),
      disabled: true,
      connectorId: undefined,
    }));

    expect(result.current).toEqual(expectedModels);
  });
});
