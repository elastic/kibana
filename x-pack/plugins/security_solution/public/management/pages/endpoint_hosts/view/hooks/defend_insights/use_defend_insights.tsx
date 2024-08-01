/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  DefendInsights,
  DefendInsightStats,
  Replacements,
  GenerationInterval,
} from '@kbn/elastic-assistant-common';

import { useAssistantContext, useLoadConnectors } from '@kbn/elastic-assistant';
import {
  DefendInsightsPostResponse,
  ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
} from '@kbn/elastic-assistant-common';
import { useFetchAnonymizationFields } from '@kbn/elastic-assistant/impl/assistant/api/anonymization_fields/use_fetch_anonymization_fields';

import type { DefendInsightsType } from '../../../../../../../common/endpoint/types/defend_insights';

import { useKibana } from '../../../../../../common/lib/kibana';
import {
  CONNECTOR_ERROR,
  ERROR_GENERATING_DEFEND_INSIGHTS,
} from '../../../../../../app/translations';
import { usePollDefendInsights } from './use_polling';
import { getGenAiConfig, getRequestBody } from './helpers';

export interface UseDefendInsights {
  eventsContextCount: number | null;
  approximateFutureTime: Date | null;
  insights: DefendInsights;
  didInitialFetch: boolean;
  failureReason: string | null;
  fetchDefendInsights: () => Promise<void>;
  generationIntervals: GenerationInterval[] | undefined;
  isLoading: boolean;
  isLoadingPost: boolean;
  replacements: Replacements;
  stats: DefendInsightStats | null;
}

export const useDefendInsights = ({
  endpointIds,
  insightType,
}: {
  endpointIds: string[];
  insightType: DefendInsightsType;
}): UseDefendInsights => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const { data: aiConnectors } = useLoadConnectors({
    http,
  });
  const connectorId = (aiConnectors && aiConnectors[0].id) ?? '';
  const [approximateFutureTime, setApproximateFutureTime] = useState<Date | null>(null);
  const [isLoadingPost, setIsLoadingPost] = useState<boolean>(false);
  const {
    data: pollData,
    pollApi,
    status: pollStatus,
    setStatus: setPollStatus,
    didInitialFetch,
    stats,
  } = usePollDefendInsights({ http, setApproximateFutureTime, toasts, connectorId });

  const [isLoading, setIsLoading] = useState(false);

  const { traceOptions } = useAssistantContext();

  const { data: anonymizationFields } = useFetchAnonymizationFields();

  const [generationIntervals, setGenerationIntervals] = React.useState<GenerationInterval[]>([]);
  const [defendInsights, setDefendInsights] = useState<DefendInsights>([]);
  const [replacements, setReplacements] = useState<Replacements>({});
  const [failureReason, setFailureReason] = useState<string | null>(null);

  // number of alerts sent as context to the LLM:
  const [eventsContextCount, setAlertsContextCount] = useState<number | null>(null);

  const requestBody = useMemo(() => {
    const selectedConnector = aiConnectors?.find((connector) => connector.id === connectorId);
    const genAiConfig = getGenAiConfig(selectedConnector);
    return getRequestBody({
      endpointIds,
      insightType,
      anonymizationFields,
      genAiConfig,
      selectedConnector,
      traceOptions,
    });
  }, [endpointIds, insightType, aiConnectors, anonymizationFields, connectorId, traceOptions]);

  useEffect(() => {
    if (connectorId != null && connectorId !== '') {
      pollApi();
      setAlertsContextCount(null);
      setFailureReason(null);
      setReplacements({});
      setDefendInsights([]);
      setGenerationIntervals([]);
      setPollStatus(null);
    }
  }, [pollApi, connectorId, setPollStatus]);

  useEffect(() => {
    if (pollStatus === 'running') {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [pollStatus, connectorId]);

  useEffect(() => {
    if (pollData !== null && pollData.connectorId === connectorId) {
      if (pollData.eventsContextCount != null) setAlertsContextCount(pollData.eventsContextCount);
      if (pollData.replacements) setReplacements(pollData.replacements);
      if (pollData.status === 'failed' && pollData.failureReason) {
        setFailureReason(pollData.failureReason);
      } else {
        setFailureReason(null);
      }
      setDefendInsights(pollData.insights);
      setGenerationIntervals(pollData.generationIntervals);
    }
  }, [connectorId, pollData]);

  const fetchDefendInsights = useCallback(async () => {
    try {
      if (requestBody.apiConfig.connectorId === '' || requestBody.apiConfig.actionTypeId === '') {
        throw new Error(CONNECTOR_ERROR);
      }
      setPollStatus('running');
      setIsLoadingPost(true);
      setApproximateFutureTime(null);
      const rawResponse = await http.fetch('/internal/elastic_assistant/defend_insights', {
        body: JSON.stringify(requestBody),
        method: 'POST',
        version: ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
      });
      setIsLoadingPost(false);
      const parsedResponse = DefendInsightsPostResponse.safeParse(rawResponse);

      if (!parsedResponse.success) {
        throw new Error('Failed to parse the response');
      }
    } catch (error) {
      setIsLoadingPost(false);
      setIsLoading(false);
      toasts?.addDanger(error, {
        title: ERROR_GENERATING_DEFEND_INSIGHTS,
        text: error.message,
      });
    }
  }, [http, requestBody, setPollStatus, toasts]);

  return {
    eventsContextCount,
    approximateFutureTime,
    insights: defendInsights,
    didInitialFetch,
    failureReason,
    fetchDefendInsights,
    generationIntervals,
    isLoading,
    isLoadingPost,
    replacements,
    stats,
  };
};
