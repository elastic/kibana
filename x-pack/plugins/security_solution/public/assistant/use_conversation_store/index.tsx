/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '@kbn/elastic-assistant';

import { unset } from 'lodash/fp';
import { DATA_QUALITY_DASHBOARD_CONVERSATION_ID } from '@kbn/ecs-data-quality-dashboard/impl/data_quality/data_quality_panel/tabs/summary_tab/callout_summary/translations';
import { useMemo } from 'react';
import { useLocalStorage } from '../../common/components/local_storage';
import { LOCAL_STORAGE_KEY } from '../helpers';
import { BASE_SECURITY_CONVERSATIONS } from '../content/conversations';
import { useLinkAuthorized } from '../../common/links';
import { SecurityPageName } from '../../../common';

export interface UseConversationStore {
  conversations: Record<string, Conversation>;
  setConversations: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
}

export const useConversationStore = (): UseConversationStore => {
  const isDataQualityDashboardPageExists = useLinkAuthorized(SecurityPageName.dataQuality);
  const baseConversations = useMemo(
    () =>
      isDataQualityDashboardPageExists
        ? BASE_SECURITY_CONVERSATIONS
        : unset(DATA_QUALITY_DASHBOARD_CONVERSATION_ID, BASE_SECURITY_CONVERSATIONS),
    [isDataQualityDashboardPageExists]
  );
  const [conversations, setConversations] = useLocalStorage<Record<string, Conversation>>({
    defaultValue: baseConversations,
    key: LOCAL_STORAGE_KEY,
    isInvalidDefault: (valueFromStorage) => {
      return !valueFromStorage;
    },
  });

  return {
    conversations,
    setConversations,
  };
};
