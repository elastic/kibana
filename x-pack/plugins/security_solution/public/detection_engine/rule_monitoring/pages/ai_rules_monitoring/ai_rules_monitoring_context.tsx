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
import { useFetchAiRuleMonitoringResultQuery } from '../../api/hooks/use_fetch_ai_rule_monitoring_result_query';

// export interface AiRulesMonitoringProviderProps {}

export interface UseAiRulesMonitoring {
  isInitialLoading: boolean;
  isFetching: boolean;
  hasConnector: boolean;
  connectorPrompt: React.ReactElement;
  result?: string;
  refetch: () => void;
}

const AiRulesMonitoringContext = React.createContext<UseAiRulesMonitoring | undefined>(undefined);

export function AiRulesMonitoringProvider({
  children,
}: PropsWithChildren<{}>): JSX.Element | undefined {
  const { isLoading: isApiConfigLoading, apiConfig, refresh } = useApiConfig();
  const { prompt: connectorPrompt } = useConnectorSetup({
    conversation: RULE_MONITORING_CONVERSATION,
    onConversationUpdate: refresh,
  });

  const {
    isFetching: isAiResponseFetching,
    data,
    refetch,
  } = useFetchAiRuleMonitoringResultQuery(apiConfig?.connectorId ?? '', {
    initialData: HINT_TEXT,
    enabled: Boolean(apiConfig?.connectorId),
  });

  const value = useMemo(
    () => ({
      isInitialLoading: isApiConfigLoading,
      isFetching: isAiResponseFetching,
      hasConnector: Boolean(apiConfig),
      connectorPrompt,
      result: data,
      refetch,
    }),
    [isApiConfigLoading, isAiResponseFetching, connectorPrompt, apiConfig, data, refetch]
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

const HINT_TEXT = `AI Rule Monitoring is a Generative AI tool to help you analyze Rule Monitoring data collected for your running rules. It might be challenging to analyze Detection Rule Monitoring dashboard or dig deep into rule execution logs to get insight on what is wrong.

We prepare rule monitoring data to be analyzed by AI of your choice. It helps to get insight on your current cluster health and spot potential problems impacting your protection if some rules are not running correctly.

Nothing is processed without your explicit concern. To perform analysis select a desired time range you want to analyze and press "Analyze" button.`;
