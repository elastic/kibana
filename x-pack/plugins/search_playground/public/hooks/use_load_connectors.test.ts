/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadAllActions as loadConnectors } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import { useLoadConnectors } from './use_load_connectors';
import { useKibana } from './use_kibana';
import { act, renderHook } from '@testing-library/react-hooks';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';

const mockedLoadConnectors = loadConnectors as jest.Mock;
const mockedUseKibana = useKibana as jest.Mock;

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn().mockImplementation(async (queryKey, fn, opts) => {
    try {
      const res = await fn();
      return Promise.resolve(res);
    } catch (e) {
      opts.onError(e);
    }
  }),
}));

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/constants', () => ({
  loadAllActions: jest.fn(),
}));

jest.mock('./use_kibana', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      http: {},
      notifications: {
        toasts: {
          addError: jest.fn(),
        },
      },
    },
  }),
}));

describe('useLoadConnectors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('successfully loads and transforms connectors', async () => {
    const connectors = [
      {
        id: '1',
        actionTypeId: '.gen-ai',
        isMissingSecrets: false,
        config: { apiProvider: OpenAiProviderType.OpenAi },
      },
      {
        id: '2',
        actionTypeId: 'slack',
        isMissingSecrets: false,
      },
      {
        id: '3',
        actionTypeId: '.gen-ai',
        isMissingSecrets: false,
        config: { apiProvider: OpenAiProviderType.AzureAi },
      },
    ];
    mockedLoadConnectors.mockResolvedValue(connectors);

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useLoadConnectors());
      await waitForNextUpdate();

      await expect(result.current).resolves.toStrictEqual({
        openai: {
          actionTypeId: '.gen-ai',
          config: {
            apiProvider: 'OpenAI',
          },
          id: '1',
          isMissingSecrets: false,
          title: 'OpenAI',
        },
        openai_azure: {
          actionTypeId: '.gen-ai',
          config: {
            apiProvider: 'Azure OpenAI',
          },
          id: '3',
          isMissingSecrets: false,
          title: 'OpenAI Azure',
        },
      });
    });
  });

  it('handles errors correctly', async () => {
    const error = new Error('Test Error');
    mockedLoadConnectors.mockRejectedValue(error);

    await act(async () => {
      const { waitForNextUpdate } = renderHook(() => useLoadConnectors());
      await waitForNextUpdate();

      expect(mockedUseKibana().services.notifications.toasts.addError).toHaveBeenCalledWith(
        error,
        expect.any(Object)
      );
    });
  });
});
