/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { useState, useMemo } from 'react';
import dateMath from '@kbn/datemath';
import type { Conversation } from '@kbn/elastic-assistant';
import type { FetchConversationsResponse } from '@kbn/elastic-assistant/impl/assistant/api';
import type { ApiConfig } from '@kbn/elastic-assistant-common';
import { useConnectorSetup } from '@kbn/elastic-assistant/impl/connectorland/connector_setup';
import { useFetchCurrentUserConversations } from '@kbn/elastic-assistant';
import {
  HealthIntervalGranularity,
  HealthIntervalType,
} from '../../../../../common/api/detection_engine';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { useFetchAiRuleMonitoringResultQuery } from '../../api/hooks/use_fetch_ai_rule_monitoring_result_query';

interface AnalyzedDateRange {
  start: string;
  end: string;
}

export interface UseAiRulesMonitoring {
  isInitialLoading: boolean;
  isFetching: boolean;
  hasConnector: boolean;
  connectorPrompt: React.ReactElement;
  analyzedDateRange: AnalyzedDateRange;
  setAnalyzedDateRange: (value: AnalyzedDateRange) => void;
  result?: string;
  refetch: () => void;
}

const AiRulesMonitoringContext = React.createContext<UseAiRulesMonitoring | undefined>(undefined);

export function AiRulesMonitoringProvider({
  children,
}: PropsWithChildren<{}>): JSX.Element | undefined {
  const [analyzedDateRange, setAnalyzedDateRange] = useState({ start: 'now-1d', end: 'now' });
  const interval = useMemo(() => {
    const from = dateMath.parse(analyzedDateRange.start);
    const to = dateMath.parse(analyzedDateRange.end);

    if (!from || !to) {
      return;
    }

    const diffInMinutes = to.diff(from, 'minute');

    return {
      type: HealthIntervalType.custom_range,
      granularity: determineIntervalGranularity(diffInMinutes),
      from: from.toISOString(),
      to: to.toISOString(),
    } as const;
  }, [analyzedDateRange]);

  const { isLoading: isApiConfigLoading, apiConfig, refresh } = useApiConfig();
  const { prompt: connectorPrompt } = useConnectorSetup({
    conversation: RULE_MONITORING_CONVERSATION,
    onConversationUpdate: refresh,
  });

  const {
    isFetching: isAiResponseFetching,
    data,
    refetch,
  } = useFetchAiRuleMonitoringResultQuery(apiConfig?.connectorId ?? '', interval, {
    initialData: '',
    enabled: Boolean(apiConfig?.connectorId),
  });

  const value = useMemo(
    () => ({
      isInitialLoading: isApiConfigLoading,
      isFetching: isAiResponseFetching,
      hasConnector: Boolean(apiConfig),
      connectorPrompt,
      analyzedDateRange,
      setAnalyzedDateRange,
      result: data,
      refetch,
    }),
    [
      isApiConfigLoading,
      isAiResponseFetching,
      connectorPrompt,
      apiConfig,
      analyzedDateRange,
      setAnalyzedDateRange,
      data,
      refetch,
    ]
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

const MINUTES_IN_HOUR = 60;
const MINUTES_IN_DAY = MINUTES_IN_HOUR * 24;
const MINUTES_IN_WEEK = MINUTES_IN_DAY * 7;
const MINUTES_IN_MONTH = MINUTES_IN_DAY * 30;

function determineIntervalGranularity(diffInMinutes: number): HealthIntervalGranularity {
  if (diffInMinutes <= MINUTES_IN_HOUR) {
    return HealthIntervalGranularity.minute;
  }

  if (diffInMinutes <= MINUTES_IN_DAY) {
    return HealthIntervalGranularity.hour;
  }

  if (diffInMinutes <= MINUTES_IN_WEEK) {
    return HealthIntervalGranularity.day;
  }

  if (diffInMinutes <= MINUTES_IN_MONTH) {
    return HealthIntervalGranularity.week;
  }

  return HealthIntervalGranularity.month;
}
