/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';
import { useConversationStore } from '.';
import { useLinkAuthorized } from '../../common/links';
import { useKibana as mockUseKibana } from '../../common/lib/kibana/__mocks__';
import { DATA_QUALITY_DASHBOARD_CONVERSATION_ID } from '@kbn/ecs-data-quality-dashboard/impl/data_quality/data_quality_panel/tabs/summary_tab/callout_summary/translations';
import { useKibana } from '../../common/lib/kibana';
import { BASE_SECURITY_CONVERSATIONS } from '../content/conversations';
import { unset } from 'lodash/fp';
import { useFetchCurrentUserConversations } from '@kbn/elastic-assistant';

const BASE_CONVERSATIONS_WITHOUT_DATA_QUALITY = unset(
  DATA_QUALITY_DASHBOARD_CONVERSATION_ID,
  BASE_SECURITY_CONVERSATIONS
);

jest.mock('../../common/links', () => ({
  useLinkAuthorized: jest.fn(),
}));

jest.mock('@kbn/elastic-assistant', () => ({
  useFetchCurrentUserConversations: jest.fn().mockReturnValue({
    data: {},
    isLoading: false,
    isError: false,
  }),
}));

const mockedUseKibana = {
  ...mockUseKibana(),
  services: {
    ...mockUseKibana().services,
    storage: {
      ...mockUseKibana().services.storage,
      get: jest.fn(),
      set: jest.fn(),
    },
  },
};

jest.mock('../../common/lib/kibana', () => {
  return {
    useKibana: jest.fn(),
  };
});

describe('useConversationStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useKibana as jest.Mock).mockReturnValue(mockedUseKibana);
  });

  it('should return conversations with "Data Quality dashboard" conversation', () => {
    (useLinkAuthorized as jest.Mock).mockReturnValue(true);
    const { result } = renderHook(() => useConversationStore());

    expect(result.current).toEqual(expect.objectContaining(BASE_SECURITY_CONVERSATIONS));
  });

  it('should return conversations Without "Data Quality dashboard" conversation', () => {
    (useLinkAuthorized as jest.Mock).mockReturnValue(false);
    const { result } = renderHook(() => useConversationStore());

    expect(result.current).toEqual(
      expect.objectContaining(BASE_CONVERSATIONS_WITHOUT_DATA_QUALITY)
    );
  });

  it('should return stored conversations merged with the base conversations', () => {
    (useLinkAuthorized as jest.Mock).mockReturnValue(true);

    const persistedConversations = {
      data: {
        '1234': {
          id: '1234',
          title: 'Welcome',
          isDefault: true,
          messages: [],
          apiConfig: {
            connectorId: 'c29c28a0-20fe-11ee-9306-a1f4d42ec542',
            provider: 'OpenAi',
          },
        },
        '5657': {
          id: '5657',
          title: 'Test',
          isDefault: true,
          messages: [],
          apiConfig: {
            connectorId: 'c29c28a0-20fe-11ee-9306-a1f4d42ec542',
            provider: 'OpenAi',
          },
        },
      },
      isLoading: false,
      isError: false,
    };
    (useFetchCurrentUserConversations as jest.Mock).mockReturnValue(persistedConversations);
    const { result } = renderHook(() => useConversationStore());

    expect(result.current).toEqual(
      expect.objectContaining(BASE_CONVERSATIONS_WITHOUT_DATA_QUALITY)
    );

    expect(result.current).toEqual(expect.objectContaining(persistedConversations.data));
  });
});
