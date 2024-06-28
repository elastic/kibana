/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAssistantContext, useLoadConnectors } from '@kbn/elastic-assistant';
import type {
  AttackDiscoveries,
  Replacements,
  GenerationInterval,
} from '@kbn/elastic-assistant-common';
import {
  AttackDiscoveryPostResponse,
  ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
} from '@kbn/elastic-assistant-common';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFetchAnonymizationFields } from '@kbn/elastic-assistant/impl/assistant/api/anonymization_fields/use_fetch_anonymization_fields';

import { usePollApi } from '../hooks/use_poll_api';
import { useKibana } from '../../common/lib/kibana';
import { getErrorToastText } from '../pages/helpers';
import { CONNECTOR_ERROR, ERROR_GENERATING_ATTACK_DISCOVERIES } from '../pages/translations';
import { getGenAiConfig, getRequestBody } from './helpers';

export interface UseAttackDiscovery {
  alertsContextCount: number | null;
  approximateFutureTime: Date | null;
  attackDiscoveries: AttackDiscoveries;
  didInitialFetch: boolean;
  failureReason: string | null;
  fetchAttackDiscoveries: () => Promise<void>;
  generationIntervals: GenerationInterval[] | undefined;
  isLoading: boolean;
  isLoadingPost: boolean;
  lastUpdated: Date | null;
  onCancel: () => Promise<void>;
  replacements: Replacements;
}

export const useAttackDiscovery = ({
  connectorId,
  setLoadingConnectorId,
}: {
  connectorId: string | undefined;
  setLoadingConnectorId?: (loadingConnectorId: string | null) => void;
}): UseAttackDiscovery => {
  // get Kibana services and connectors
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const { data: aiConnectors } = useLoadConnectors({
    http,
  });

  // generation can take a long time, so we calculate an approximate future time:
  const [approximateFutureTime, setApproximateFutureTime] = useState<Date | null>(null);
  // whether post request is loading (dont show actions)
  const [isLoadingPost, setIsLoadingPost] = useState<boolean>(false);
  const {
    cancelAttackDiscovery,
    data: pollData,
    pollApi,
    status: pollStatus,
    didInitialFetch,
  } = usePollApi({ http, setApproximateFutureTime, toasts, connectorId });

  // loading boilerplate:
  const [isLoading, setIsLoading] = useState(false);

  // get alerts index pattern and allow lists from the assistant context:
  const { alertsIndexPattern, knowledgeBase, traceOptions } = useAssistantContext();

  const { data: anonymizationFields } = useFetchAnonymizationFields();

  const [generationIntervals, setGenerationIntervals] = React.useState<GenerationInterval[]>([]);
  const [attackDiscoveries, setAttackDiscoveries] = useState<AttackDiscoveries>([]);
  const [replacements, setReplacements] = useState<Replacements>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [failureReason, setFailureReason] = useState<string | null>(null);

  // number of alerts sent as context to the LLM:
  const [alertsContextCount, setAlertsContextCount] = useState<number | null>(null);

  const requestBody = useMemo(() => {
    const selectedConnector = aiConnectors?.find((connector) => connector.id === connectorId);
    const genAiConfig = getGenAiConfig(selectedConnector);
    return getRequestBody({
      alertsIndexPattern,
      anonymizationFields,
      genAiConfig,
      knowledgeBase,
      selectedConnector,
      traceOptions,
    });
  }, [
    aiConnectors,
    alertsIndexPattern,
    anonymizationFields,
    connectorId,
    knowledgeBase,
    traceOptions,
  ]);

  useEffect(() => {
    if (connectorId != null && connectorId !== '') {
      pollApi();
      setLoadingConnectorId?.(connectorId);
      setAlertsContextCount(null);
      setFailureReason(null);
      setLastUpdated(null);
      setReplacements({});
      setAttackDiscoveries([]);
      setGenerationIntervals([]);
    }
  }, [pollApi, connectorId, setLoadingConnectorId]);

  useEffect(() => {
    if (pollStatus === 'running') {
      setIsLoading(true);
      setLoadingConnectorId?.(connectorId ?? null);
    } else {
      setIsLoading(false);
      setLoadingConnectorId?.(null);
    }
  }, [pollStatus, connectorId, setLoadingConnectorId]);

  useEffect(() => {
    if (pollData !== null && pollData.connectorId === connectorId) {
      if (pollData.alertsContextCount != null) setAlertsContextCount(pollData.alertsContextCount);
      if (pollData.attackDiscoveries.length) {
        // get last updated from timestamp, not from updatedAt since this can indicate the last time the status was updated
        setLastUpdated(new Date(pollData.attackDiscoveries[0].timestamp));
      }
      if (pollData.replacements) setReplacements(pollData.replacements);
      if (pollData.status === 'failed' && pollData.failureReason) {
        setFailureReason(pollData.failureReason);
      } else {
        setFailureReason(null);
      }
      setAttackDiscoveries(pollData.attackDiscoveries);
      setGenerationIntervals(pollData.generationIntervals);
    }
  }, [connectorId, pollData]);

  /** The callback when users click the Generate button */
  const fetchAttackDiscoveries = useCallback(async () => {
    try {
      if (requestBody.apiConfig.connectorId === '' || requestBody.apiConfig.actionTypeId === '') {
        throw new Error(CONNECTOR_ERROR);
      }
      setLoadingConnectorId?.(connectorId ?? null);
      setIsLoading(true);
      setIsLoadingPost(true);
      setApproximateFutureTime(null);
      // call the internal API to generate attack discoveries:
      const rawResponse = await http.fetch('/internal/elastic_assistant/attack_discovery', {
        body: JSON.stringify(requestBody),
        method: 'POST',
        version: ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
      });
      setIsLoadingPost(false);
      const parsedResponse = AttackDiscoveryPostResponse.safeParse(rawResponse);

      if (!parsedResponse.success) {
        throw new Error('Failed to parse the response');
      }

      if (parsedResponse.data.status === 'running') {
        pollApi();
      }
    } catch (error) {
      setIsLoadingPost(false);
      setIsLoading(false);
      toasts?.addDanger(error, {
        title: ERROR_GENERATING_ATTACK_DISCOVERIES,
        text: getErrorToastText(error),
      });
    }
  }, [connectorId, http, pollApi, requestBody, setLoadingConnectorId, toasts]);

  return {
    alertsContextCount,
    approximateFutureTime,
    attackDiscoveries,
    didInitialFetch,
    failureReason,
    fetchAttackDiscoveries,
    generationIntervals,
    isLoading,
    isLoadingPost,
    lastUpdated,
    onCancel: cancelAttackDiscovery,
    replacements,
  };
};
