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

const BASE_CONVERSATIONS_WITHOUT_DATA_QUALITY = unset(
  DATA_QUALITY_DASHBOARD_CONVERSATION_ID,
  BASE_SECURITY_CONVERSATIONS
);

jest.mock('../../common/links', () => ({
  useLinkAuthorized: jest.fn(),
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

    expect(result.current.conversations).toEqual(
      expect.objectContaining(BASE_SECURITY_CONVERSATIONS)
    );
  });

  it('should return conversations Without "Data Quality dashboard" conversation', () => {
    (useLinkAuthorized as jest.Mock).mockReturnValue(false);
    const { result } = renderHook(() => useConversationStore());

    expect(result.current.conversations).toEqual(
      expect.objectContaining(BASE_CONVERSATIONS_WITHOUT_DATA_QUALITY)
    );
  });
});
