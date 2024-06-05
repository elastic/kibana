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
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFetchAnonymizationFields } from '@kbn/elastic-assistant/impl/assistant/api/anonymization_fields/use_fetch_anonymization_fields';

import { usePollApi } from '../hooks/use_poll_api';
import { useKibana } from '../../common/lib/kibana';
import { useAttackDiscoveryTelemetry } from '../hooks/use_attack_discovery_telemetry';
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
  const { reportAttackDiscoveriesGenerated } = useAttackDiscoveryTelemetry();

  // get Kibana services and connectors
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const { data: aiConnectors } = useLoadConnectors({
    http,
  });

  const { status: pollStatus, pollApi, data: pollData, error: pollError } = usePollApi({ http });

  // loading boilerplate:
  const [isLoading, setIsLoading] = useState(false);

  // get alerts index pattern and allow lists from the assistant context:
  const { alertsIndexPattern, knowledgeBase, traceOptions } = useAssistantContext();

  const { data: anonymizationFields } = useFetchAnonymizationFields();

  const [generationIntervals, setGenerationIntervals] = React.useState<
    GenerationInterval[] | undefined
  >(undefined);

  // generation can take a long time, so we calculate an approximate future time:
  const [approximateFutureTime, setApproximateFutureTime] = useState<Date | null>(null);
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
    console.log('stephhh useEffect pollApi');
    pollApi(requestBody.connectorId);
  }, [pollApi, requestBody.connectorId]);

  useEffect(() => {
    console.log('stephhh useEffect pollData', pollData);
    if (pollData !== null) {
      setApproximateFutureTime(null);
      setLoadingConnectorId?.(null);
      setIsLoading(false);
      if (pollData.alertsContextCount) setAlertsContextCount(pollData.alertsContextCount);
      if (pollData.updatedAt) setLastUpdated(new Date(pollData.updatedAt));
      if (pollData.replacements) setReplacements(pollData.replacements);
      setAttackDiscoveries(pollData.attackDiscoveries);
      setGenerationIntervals(pollData.generationIntervals);
    }
  }, [pollData]);

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
      console.log('stephhh parsedResponse', {
        parsedResponse,
        rawResponse,
      });
      if (!parsedResponse.success) {
        throw new Error('Failed to parse the response');
      }
      setApproximateFutureTime(
        moment().add(parsedResponse.data.averageIntervalMs, 'milliseconds').toDate()
      );
      if (parsedResponse.data.status === 'running') {
        console.log('stephhh poll following post request before');
        await pollApi(requestBody.connectorId);
        console.log('stephhh poll following post request after');
      }
      //
      // const endTime = moment();
      // const durationMs = endTime.diff(startTime);
      //
      // // update the cached attack discoveries with the new discoveries:
      // const newAttackDiscoveries: AttackDiscovery[] =
      //   parsedResponse.data.attackDiscoveries?.map((attackDiscovery) => ({
      //     alertIds: [...attackDiscovery.alertIds],
      //     detailsMarkdown: replaceNewlineLiterals(attackDiscovery.detailsMarkdown),
      //     entitySummaryMarkdown: replaceNewlineLiterals(attackDiscovery.entitySummaryMarkdown),
      //     id: uuid.v4(),
      //     mitreAttackTactics: attackDiscovery.mitreAttackTactics,
      //     summaryMarkdown: replaceNewlineLiterals(attackDiscovery.summaryMarkdown),
      //     title: attackDiscovery.title,
      //   })) ?? [];
      //
      // const responseReplacements = parsedResponse.data.replacements ?? {};
      // const newReplacements = { ...replacements, ...responseReplacements };
      //
      // const newLastUpdated = new Date();
      //
      // const newCachedAttackDiscoveries = {
      //   ...cachedAttackDiscoveries,
      //   [connectorId ?? '']: {
      //     connectorId: connectorId ?? '',
      //     attackDiscoveries: newAttackDiscoveries,
      //     replacements: newReplacements,
      //     updated: newLastUpdated,
      //   },
      // };
      //
      // setCachedAttackDiscoveries(newCachedAttackDiscoveries);
      // setSessionStorageCachedAttackDiscoveries({
      //   key: sessionStorageKey,
      //   cachedAttackDiscoveries: newCachedAttackDiscoveries,
      // });
      //
      // // update the generation intervals with the latest timing:
      // const previousConnectorIntervals: GenerationInterval[] =
      //   generationIntervals != null ? generationIntervals[connectorId ?? ''] ?? [] : [];
      // const newInterval: GenerationInterval = {
      //   connectorId: connectorId ?? '',
      //   date: new Date(),
      //   durationMs,
      // };
      //
      // const newConnectorIntervals = [newInterval, ...previousConnectorIntervals].slice(
      //   0,
      //   MAX_GENERATION_INTERVALS
      // );
      // const newGenerationIntervals: Record<string, GenerationInterval[]> = {
      //   ...generationIntervals,
      //   [connectorId ?? '']: newConnectorIntervals,
      // };
      //
      // const newAlertsContextCount = parsedResponse.data.alertsContextCount ?? null;
      // setAlertsContextCount(newAlertsContextCount);
      //
      // // only update the generation intervals if alerts were sent as context to the LLM:
      // if (newAlertsContextCount != null && newAlertsContextCount > 0) {
      //   setGenerationIntervals(newGenerationIntervals);
      //   setLocalStorageGenerationIntervals({
      //     key: localStorageKey,
      //     generationIntervals: newGenerationIntervals,
      //   });
      // }
      //
      // setReplacements(newReplacements);
      // setAttackDiscoveries(newAttackDiscoveries);
      // setLastUpdated(newLastUpdated);
      // setConnectorId?.(connectorId);
      // const connectorConfig = getGenAiConfig(selectedConnector);
      // reportAttackDiscoveriesGenerated({
      //   actionTypeId,
      //   durationMs,
      //   alertsContextCount: newAlertsContextCount ?? 0,
      //   alertsCount: uniq(
      //     newAttackDiscoveries.flatMap((attackDiscovery) => attackDiscovery.alertIds)
      //   ).length,
      //   configuredAlertsCount: knowledgeBase.latestAlerts,
      //   provider: connectorConfig?.apiProvider,
      //   model: connectorConfig?.defaultModel,
      // });
    } catch (error) {
      toasts?.addDanger(error, {
        title: ERROR_GENERATING_ATTACK_DISCOVERIES,
        text: getErrorToastText(error),
      });
    } finally {
      setApproximateFutureTime(null);
      setLoadingConnectorId?.(null);
      setIsLoading(false);
      console.log('stephhh poll following post request finally');
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
