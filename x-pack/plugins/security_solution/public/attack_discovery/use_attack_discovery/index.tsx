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
import { getErrorToastText, getFallbackActionTypeId } from '../pages/helpers';
import { ERROR_GENERATING_ATTACK_DISCOVERIES } from '../pages/translations';
import { getRequestBody } from './helpers';

export interface UseAttackDiscovery {
  alertsContextCount: number | null;
  approximateFutureTime: Date | null;
  attackDiscoveries: AttackDiscoveries;
  fetchAttackDiscoveries: () => Promise<void>;
  generationIntervals: GenerationInterval[] | undefined;
  isLoading: boolean;
  lastUpdated: Date | null;
  replacements: Replacements;
}

export const useAttackDiscovery = ({
  connectorId,
  setConnectorId,
  setLoadingConnectorId,
}: {
  connectorId: string | undefined;
  setConnectorId?: (connectorId: string | undefined) => void;
  setLoadingConnectorId?: (loadingConnectorId: string | null) => void;
}): UseAttackDiscovery => {
  // TODO implement telemetry server side
  // const { reportAttackDiscoveriesGenerated } = useAttackDiscoveryTelemetry();

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
  const {
    status: pollStatus,
    pollApi,
    data: pollData,
  } = usePollApi({ http, setApproximateFutureTime, toasts });

  // loading boilerplate:
  const [isLoading, setIsLoading] = useState(false);

  // get alerts index pattern and allow lists from the assistant context:
  const { alertsIndexPattern, knowledgeBase, traceOptions } = useAssistantContext();

  const { data: anonymizationFields } = useFetchAnonymizationFields();

  const [generationIntervals, setGenerationIntervals] = React.useState<
    GenerationInterval[] | undefined
  >(undefined);
  const [attackDiscoveries, setAttackDiscoveries] = useState<AttackDiscoveries>([]);
  const [replacements, setReplacements] = useState<Replacements>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // number of alerts sent as context to the LLM:
  const [alertsContextCount, setAlertsContextCount] = useState<number | null>(null);

  const requestBody = useMemo(() => {
    const selectedConnector = aiConnectors?.find((connector) => connector.id === connectorId);
    const actionTypeId = getFallbackActionTypeId(selectedConnector?.actionTypeId);
    return getRequestBody({
      actionTypeId,
      alertsIndexPattern,
      anonymizationFields,
      connectorId,
      knowledgeBase,
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
    pollApi(requestBody.connectorId);
    setAlertsContextCount(null);
    setLastUpdated(null);
    setReplacements({});
    setAttackDiscoveries([]);
    setGenerationIntervals([]);
  }, [pollApi, requestBody.connectorId]);

  useEffect(() => {
    setIsLoading(pollStatus === 'running');
  }, [pollStatus]);

  useEffect(() => {
    if (pollData !== null && pollData.connectorId === connectorId) {
      if (pollData.alertsContextCount) setAlertsContextCount(null);
      if (pollData.updatedAt) setLastUpdated(new Date(pollData.updatedAt));
      if (pollData.replacements) setReplacements(pollData.replacements);
      setAttackDiscoveries(pollData.attackDiscoveries);
      setGenerationIntervals(pollData.generationIntervals);
    }
  }, [connectorId, pollData]);

  /** The callback when users click the Generate button */
  const fetchAttackDiscoveries = useCallback(async () => {
    try {
      setLoadingConnectorId?.(connectorId ?? null);
      setIsLoading(true);
      setApproximateFutureTime(null);
      // call the internal API to generate attack discoveries:
      const rawResponse = await http.fetch('/internal/elastic_assistant/attack_discovery', {
        body: JSON.stringify(requestBody),
        method: 'POST',
        version: ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
      });

      const parsedResponse = AttackDiscoveryPostResponse.safeParse(rawResponse);

      if (!parsedResponse.success) {
        throw new Error('Failed to parse the response');
      }

      if (parsedResponse.data.status === 'running') {
        await pollApi(requestBody.connectorId);
      }
    } catch (error) {
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
    fetchAttackDiscoveries,
    generationIntervals,
    isLoading,
    lastUpdated,
    replacements,
  };
};
