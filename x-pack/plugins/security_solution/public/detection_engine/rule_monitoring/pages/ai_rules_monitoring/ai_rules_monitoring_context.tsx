/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { useMemo } from 'react';
import type { Conversation } from '@kbn/elastic-assistant';
import type { FetchConversationsResponse } from '@kbn/elastic-assistant/impl/assistant/api';
import type { ApiConfig } from '@kbn/elastic-assistant-common';
import { useConnectorSetup } from '@kbn/elastic-assistant/impl/connectorland/connector_setup';
import { useFetchCurrentUserConversations } from '@kbn/elastic-assistant';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';

// export interface AiRulesMonitoringProviderProps {}

export interface UseAiRulesMonitoring {
  isLoading: boolean;
  hasConnector: boolean;
  connectorPrompt: React.ReactElement;
}

const AiRulesMonitoringContext = React.createContext<UseAiRulesMonitoring | undefined>(undefined);

export function AiRulesMonitoringProvider({
  children,
}: PropsWithChildren<{}>): JSX.Element | undefined {
  const { isLoading, apiConfig, refresh } = useApiConfig();
  const { prompt: connectorPrompt } = useConnectorSetup({
    conversation: RULE_MONITORING_CONVERSATION,
    onConversationUpdate: refresh,
  });

  const value = useMemo(
    () => ({
      isLoading,
      hasConnector: Boolean(apiConfig),
      connectorPrompt,
    }),
    [isLoading, connectorPrompt, apiConfig]
  );

  return (
    <AiRulesMonitoringContext.Provider value={value}>{children}</AiRulesMonitoringContext.Provider>
  );
}

export const useAiRulesMonitoringContext = () => {
  const context = React.useContext(AiRulesMonitoringContext);

  if (context == null) {
    throw new Error('useAiRulesMonitoringContext must be used within a AiRulesMonitoringProvider');
  }

  return context;
};

const RULE_MONITORING_CONVERSATION: Conversation = {
  id: '',
  title: 'Rule Monitoring',
  category: 'assistant',
  messages: [],
  replacements: [],
};

interface UseApiConfigResult {
  isLoading: boolean;
  apiConfig?: ApiConfig;
  refresh: () => Promise<void>;
}

function useApiConfig(): UseApiConfigResult {
  const { http } = useKibana().services;
  const {
    isLoading,
    data: conversationsData,
    refetch,
  } = useFetchCurrentUserConversations({
    http,
    onFetch: convertFetchConversationsResponseToMap,
  });

  return useMemo(
    () => ({
      isLoading,
      apiConfig: conversationsData
        ? Object.values(conversationsData).find((x) => Boolean(x.apiConfig))?.apiConfig
        : undefined,
      refresh: async () => {
        await refetch();
      },
    }),
    [isLoading, conversationsData, refetch]
  );
}
function convertFetchConversationsResponseToMap(
  response: FetchConversationsResponse
): Record<string, Conversation> {
  return response?.data.reduce<Record<string, Conversation>>((map, conversation, i) => {
    map[i] = conversation;

    return map;
  }, {});
}
