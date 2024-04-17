/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AI_INSIGHTS_STORAGE_KEY,
  DEFAULT_ASSISTANT_NAMESPACE,
  useAssistantContext,
  useLoadConnectors,
} from '@kbn/elastic-assistant';
import type { AlertsInsightsPostRequestBody, Replacements } from '@kbn/elastic-assistant-common';
import {
  AlertsInsightsPostResponse,
  ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
} from '@kbn/elastic-assistant-common';
import moment from 'moment';
import React, { useCallback, useMemo, useState } from 'react';
import { useLocalStorage, useSessionStorage } from 'react-use';
import * as uuid from 'uuid';
import { useFetchAnonymizationFields } from '@kbn/elastic-assistant/impl/assistant/api/anonymization_fields/use_fetch_anonymization_fields';

import { useKibana } from '../../common/lib/kibana';
import { replaceNewlineLiterals } from '../helpers';
import {
  CACHED_INSIGHTS_SESSION_STORAGE_KEY,
  GENERATION_INTERVALS_LOCAL_STORAGE_KEY,
  getErrorToastText,
  getFallbackActionTypeId,
} from '../pages/helpers';
import { getAverageIntervalSeconds } from '../pages/loading_callout/countdown/last_times_popover/helpers';
import type { CachedInsights } from '../pages/session_storage';
import { encodeCachedInsights, decodeCachedInsights } from '../pages/session_storage';
import { ERROR_GENERATING_INSIGHTS } from '../pages/translations';
import type { AlertsInsight, GenerationInterval } from '../types';

const MAX_GENERATION_INTERVALS = 5;

export const useInsights = ({
  connectorId,
  setConnectorId,
  setLoadingConnectorId,
}: {
  connectorId: string | undefined;
  setConnectorId?: (connectorId: string | undefined) => void;
  setLoadingConnectorId?: (loadingConnectorId: string | null) => void;
}) => {
  // get Kibana services and connectors
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const { data: aiConnectors } = useLoadConnectors({
    http,
  });

  // loading boilerplate:
  const [isLoading, setIsLoading] = useState(false);

  // get alerts index pattern and allow lists from the assistant context:
  const { alertsIndexPattern, knowledgeBase } = useAssistantContext();

  const { data: anonymizationFields } = useFetchAnonymizationFields();

  // get cached insights from session storage:
  const [sessionStorageCachedInsights, setSessionStorageCachedInsights] = useSessionStorage<string>(
    `${DEFAULT_ASSISTANT_NAMESPACE}.${AI_INSIGHTS_STORAGE_KEY}.${CACHED_INSIGHTS_SESSION_STORAGE_KEY}`
  );
  const [cachedInsights, setCachedInsights] = useState<Record<string, CachedInsights>>(
    decodeCachedInsights(sessionStorageCachedInsights) ?? {}
  );

  // get generation intervals from local storage:
  const [localStorageGenerationIntervals, setLocalStorageGenerationIntervals] = useLocalStorage<
    Record<string, GenerationInterval[]>
  >(
    `${DEFAULT_ASSISTANT_NAMESPACE}.${AI_INSIGHTS_STORAGE_KEY}.${GENERATION_INTERVALS_LOCAL_STORAGE_KEY}`
  );
  const [generationIntervals, setGenerationIntervals] = React.useState<
    Record<string, GenerationInterval[]> | undefined
  >(localStorageGenerationIntervals);

  // get connector intervals from generation intervals:
  const connectorIntervals = useMemo(
    () => generationIntervals?.[connectorId ?? ''] ?? [],
    [connectorId, generationIntervals]
  );

  // generation can take a long time, so we calculate an approximate future time:
  const [approximateFutureTime, setApproximateFutureTime] = useState<Date | null>(null);

  // get cached insights if they exist:
  const [insights, setInsights] = useState<AlertsInsight[]>(
    cachedInsights[connectorId ?? '']?.insights ?? []
  );

  // get replacements from the cached insights if they exist:
  const [replacements, setReplacements] = useState<Replacements>(
    cachedInsights[connectorId ?? '']?.replacements ?? {}
  );

  // get last updated from the cached insights if it exists:
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    cachedInsights[connectorId ?? '']?.updated ?? null
  );

  /** The callback when users click the Generate button */
  const fetchInsights = useCallback(async () => {
    const selectedConnector = aiConnectors?.find((connector) => connector.id === connectorId);
    const actionTypeId = getFallbackActionTypeId(selectedConnector?.actionTypeId);

    const body: AlertsInsightsPostRequestBody = {
      actionTypeId,
      alertsIndexPattern: alertsIndexPattern ?? '',
      anonymizationFields: anonymizationFields?.data ?? [],
      connectorId: connectorId ?? '',
      size: knowledgeBase.latestAlerts,
      replacements: {}, // no need to re-use replacements in the current implementation
      subAction: 'invokeAI', // non-streaming
    };

    try {
      setLoadingConnectorId?.(connectorId ?? null);
      setIsLoading(true);
      setApproximateFutureTime(null);

      const averageIntervalSeconds = getAverageIntervalSeconds(connectorIntervals);
      setApproximateFutureTime(moment().add(averageIntervalSeconds, 'seconds').toDate());

      const startTime = moment(); // start timing the generation

      // call the internal API to generate insights:
      const rawResponse = await http.fetch('/internal/elastic_assistant/insights/alerts', {
        body: JSON.stringify(body),
        method: 'POST',
        version: ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
      });

      const parsedResponse = AlertsInsightsPostResponse.safeParse(rawResponse);
      if (!parsedResponse.success) {
        throw new Error('Failed to parse the response');
      }

      const endTime = moment();
      const durationMs = endTime.diff(startTime);

      // update the cached insights with the new insights:
      const newInsights: AlertsInsight[] =
        parsedResponse.data.insights?.map((insight) => ({
          alertIds: [...insight.alertIds],
          detailsMarkdown: replaceNewlineLiterals(insight.detailsMarkdown),
          entitySummaryMarkdown: replaceNewlineLiterals(insight.entitySummaryMarkdown),
          id: uuid.v4(),
          mitreAttackTactics: insight.mitreAttackTactics,
          summaryMarkdown: replaceNewlineLiterals(insight.summaryMarkdown),
          title: insight.title,
        })) ?? [];

      const responseReplacements = parsedResponse.data.replacements ?? {};
      const newReplacements = { ...replacements, ...responseReplacements };

      const newLastUpdated = new Date();

      const newCachedInsights = {
        ...cachedInsights,
        [connectorId ?? '']: {
          connectorId: connectorId ?? '',
          insights: newInsights,
          replacements: newReplacements,
          updated: newLastUpdated,
        },
      };

      setCachedInsights(newCachedInsights);
      setSessionStorageCachedInsights(encodeCachedInsights(newCachedInsights) ?? '');

      // update the generation intervals with the latest timing:
      const previousConnectorIntervals: GenerationInterval[] =
        generationIntervals != null ? generationIntervals[connectorId ?? ''] ?? [] : [];
      const newInterval: GenerationInterval = {
        connectorId: connectorId ?? '',
        date: new Date(),
        durationMs,
      };

      const newConnectorIntervals = [newInterval, ...previousConnectorIntervals].slice(
        0,
        MAX_GENERATION_INTERVALS
      );
      const newGenerationIntervals: Record<string, GenerationInterval[]> = {
        ...generationIntervals,
        [connectorId ?? '']: newConnectorIntervals,
      };

      setGenerationIntervals(newGenerationIntervals);
      setLocalStorageGenerationIntervals(newGenerationIntervals);

      setReplacements(newReplacements);
      setInsights(newInsights);
      setLastUpdated(newLastUpdated);
      setConnectorId?.(connectorId);
    } catch (error) {
      toasts?.addDanger(error, {
        title: ERROR_GENERATING_INSIGHTS,
        text: getErrorToastText(error),
      });
    } finally {
      setApproximateFutureTime(null);
      setLoadingConnectorId?.(null);
      setIsLoading(false);
    }
  }, [
    aiConnectors,
    alertsIndexPattern,
    anonymizationFields?.data,
    cachedInsights,
    connectorId,
    connectorIntervals,
    generationIntervals,
    http,
    knowledgeBase.latestAlerts,
    replacements,
    setConnectorId,
    setLoadingConnectorId,
    setLocalStorageGenerationIntervals,
    setSessionStorageCachedInsights,
    toasts,
  ]);

  return {
    approximateFutureTime,
    cachedInsights,
    fetchInsights,
    generationIntervals,
    insights,
    isLoading,
    lastUpdated,
    replacements,
  };
};
