/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetchCurrentUserConversations, type Conversation } from '@kbn/elastic-assistant';

import { merge, unset } from 'lodash/fp';
import { DATA_QUALITY_DASHBOARD_CONVERSATION_ID } from '@kbn/ecs-data-quality-dashboard/impl/data_quality/data_quality_panel/tabs/summary_tab/callout_summary/translations';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FetchConversationsResponse } from '@kbn/elastic-assistant/impl/assistant/api';
import { BASE_SECURITY_CONVERSATIONS } from '../content/conversations';
import { useLinkAuthorized } from '../../common/links';
import { SecurityPageName } from '../../../common';

export const useConversationStore = (): Record<string, Conversation> => {
  const [conversations, setConversations] = useState<Record<string, Conversation>>({});
  const isDataQualityDashboardPageExists = useLinkAuthorized(SecurityPageName.dataQuality);
  const baseConversations = useMemo(
    () =>
      isDataQualityDashboardPageExists
        ? BASE_SECURITY_CONVERSATIONS
        : unset(DATA_QUALITY_DASHBOARD_CONVERSATION_ID, BASE_SECURITY_CONVERSATIONS),
    [isDataQualityDashboardPageExists]
  );

  const onFetchedConversations = useCallback(
    (conversationsData: FetchConversationsResponse): Record<string, Conversation> => {
      const userConversations = (conversationsData?.data ?? []).reduce<
        Record<string, Conversation>
      >((transformed, conversation) => {
        transformed[conversation.id] = conversation;
        return transformed;
      }, {});
      return merge(
        userConversations,
        Object.keys(baseConversations)
          .filter(
            (baseId) =>
              (conversationsData?.data ?? []).find((c) => c.title === baseId) === undefined
          )
          .reduce<Record<string, Conversation>>((transformed, conversation) => {
            transformed[conversation] = baseConversations[conversation];
            return transformed;
          }, {})
      );
    },
    [baseConversations]
  );
  const {
    data: conversationsData,
    isLoading,
    isError,
  } = useFetchCurrentUserConversations(onFetchedConversations);

  useEffect(() => {
    if (!isLoading && !isError) {
      setConversations(conversationsData ?? {});
    }
  }, [conversationsData, isLoading, isError]);

  const result = useMemo(
    () => merge(baseConversations, conversations),
    [baseConversations, conversations]
  );

  return result;
};

export const useBaseConversations = (): Record<string, Conversation> => {
  const isDataQualityDashboardPageExists = useLinkAuthorized(SecurityPageName.dataQuality);
  const baseConversations = useMemo(
    () =>
      isDataQualityDashboardPageExists
        ? BASE_SECURITY_CONVERSATIONS
        : unset(DATA_QUALITY_DASHBOARD_CONVERSATION_ID, BASE_SECURITY_CONVERSATIONS),
    [isDataQualityDashboardPageExists]
  );
  return baseConversations;
};
