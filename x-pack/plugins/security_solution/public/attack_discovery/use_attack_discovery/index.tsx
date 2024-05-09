/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTACK_DISCOVERY_STORAGE_KEY,
  DEFAULT_ASSISTANT_NAMESPACE,
  useAssistantContext,
  useLoadConnectors,
} from '@kbn/elastic-assistant';
import type { Replacements } from '@kbn/elastic-assistant-common';
import {
  AttackDiscoveryPostResponse,
  ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
} from '@kbn/elastic-assistant-common';
import { uniq } from 'lodash/fp';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as uuid from 'uuid';
import { useFetchAnonymizationFields } from '@kbn/elastic-assistant/impl/assistant/api/anonymization_fields/use_fetch_anonymization_fields';

import { useSpaceId } from '../../common/hooks/use_space_id';
import { useKibana } from '../../common/lib/kibana';
import { replaceNewlineLiterals } from '../helpers';
import { useAttackDiscoveryTelemetry } from '../hooks/use_attack_discovery_telemetry';
import {
  CACHED_ATTACK_DISCOVERIES_SESSION_STORAGE_KEY,
  GENERATION_INTERVALS_LOCAL_STORAGE_KEY,
  getErrorToastText,
  getFallbackActionTypeId,
} from '../pages/helpers';
import { getAverageIntervalSeconds } from '../pages/loading_callout/countdown/last_times_popover/helpers';
import type { CachedAttackDiscoveries } from '../pages/session_storage';
import {
  getLocalStorageGenerationIntervals,
  getSessionStorageCachedAttackDiscoveries,
  setLocalStorageGenerationIntervals,
  setSessionStorageCachedAttackDiscoveries,
} from '../pages/session_storage';
import { ERROR_GENERATING_ATTACK_DISCOVERIES } from '../pages/translations';
import type { AttackDiscovery, GenerationInterval } from '../types';
import { getGenAiConfig, getRequestBody } from './helpers';

const MAX_GENERATION_INTERVALS = 5;

export interface UseAttackDiscovery {
  alertsContextCount: number | null;
  approximateFutureTime: Date | null;
  attackDiscoveries: AttackDiscovery[];
  cachedAttackDiscoveries: Record<string, CachedAttackDiscoveries>;
  fetchAttackDiscoveries: () => Promise<void>;
  generationIntervals: Record<string, GenerationInterval[]> | undefined;
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
  const spaceId: string | undefined = useSpaceId();

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
  const { alertsIndexPattern, knowledgeBase, traceOptions } = useAssistantContext();

  const { data: anonymizationFields } = useFetchAnonymizationFields();

  const sessionStorageKey = useMemo(
    () =>
      spaceId != null // spaceId is undefined while the useSpaceId hook is loading
        ? `${DEFAULT_ASSISTANT_NAMESPACE}.${ATTACK_DISCOVERY_STORAGE_KEY}.${spaceId}.${CACHED_ATTACK_DISCOVERIES_SESSION_STORAGE_KEY}`
        : '',
    [spaceId]
  );

  const [cachedAttackDiscoveries, setCachedAttackDiscoveries] = useState<
    Record<string, CachedAttackDiscoveries>
  >({});

  useEffect(() => {
    const decoded = getSessionStorageCachedAttackDiscoveries(sessionStorageKey);

    if (decoded != null) {
      setCachedAttackDiscoveries(decoded);

      const decodedAttackDiscoveries = decoded[connectorId ?? '']?.attackDiscoveries;
      if (decodedAttackDiscoveries != null) {
        setAttackDiscoveries(decodedAttackDiscoveries);
      }

      const decodedReplacements = decoded[connectorId ?? '']?.replacements;
      if (decodedReplacements != null) {
        setReplacements(decodedReplacements);
      }

      const decodedLastUpdated = decoded[connectorId ?? '']?.updated;
      if (decodedLastUpdated != null) {
        setLastUpdated(decodedLastUpdated);
      }
    }
  }, [connectorId, sessionStorageKey]);

  const localStorageKey = useMemo(
    () =>
      spaceId != null // spaceId is undefined while the useSpaceId hook is loading
        ? `${DEFAULT_ASSISTANT_NAMESPACE}.${ATTACK_DISCOVERY_STORAGE_KEY}.${spaceId}.${GENERATION_INTERVALS_LOCAL_STORAGE_KEY}`
        : '',
    [spaceId]
  );

  const [generationIntervals, setGenerationIntervals] = React.useState<
    Record<string, GenerationInterval[]> | undefined
  >(undefined);

  useEffect(() => {
    const decoded = getLocalStorageGenerationIntervals(localStorageKey);

    if (decoded != null) {
      setGenerationIntervals(decoded);
    }
  }, [localStorageKey]);

  // get connector intervals from generation intervals:
  const connectorIntervals = useMemo(
    () => generationIntervals?.[connectorId ?? ''] ?? [],
    [connectorId, generationIntervals]
  );

  // generation can take a long time, so we calculate an approximate future time:
  const [approximateFutureTime, setApproximateFutureTime] = useState<Date | null>(null);

  // get cached attack discoveries if they exist:
  const [attackDiscoveries, setAttackDiscoveries] = useState<AttackDiscovery[]>(
    cachedAttackDiscoveries[connectorId ?? '']?.attackDiscoveries ?? []
  );

  // get replacements from the cached attack discoveries if they exist:
  const [replacements, setReplacements] = useState<Replacements>(
    cachedAttackDiscoveries[connectorId ?? '']?.replacements ?? {}
  );

  // get last updated from the cached attack discoveries if it exists:
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    cachedAttackDiscoveries[connectorId ?? '']?.updated ?? null
  );

  // number of alerts sent as context to the LLM:
  const [alertsContextCount, setAlertsContextCount] = useState<number | null>(null);

  /** The callback when users click the Generate button */
  const fetchAttackDiscoveries = useCallback(async () => {
    const selectedConnector = aiConnectors?.find((connector) => connector.id === connectorId);
    const actionTypeId = getFallbackActionTypeId(selectedConnector?.actionTypeId);

    const body = getRequestBody({
      actionTypeId,
      alertsIndexPattern,
      anonymizationFields,
      connectorId,
      knowledgeBase,
      traceOptions,
    });

    try {
      setLoadingConnectorId?.(connectorId ?? null);
      setIsLoading(true);
      setApproximateFutureTime(null);

      const averageIntervalSeconds = getAverageIntervalSeconds(connectorIntervals);
      setApproximateFutureTime(moment().add(averageIntervalSeconds, 'seconds').toDate());

      const startTime = moment(); // start timing the generation

      // call the internal API to generate attack discoveries:
      const rawResponse = await http.fetch('/internal/elastic_assistant/attack_discovery', {
        body: JSON.stringify(body),
        method: 'POST',
        version: ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
      });

      const parsedResponse = AttackDiscoveryPostResponse.safeParse(rawResponse);
      if (!parsedResponse.success) {
        throw new Error('Failed to parse the response');
      }

      const endTime = moment();
      const durationMs = endTime.diff(startTime);

      // update the cached attack discoveries with the new discoveries:
      const newAttackDiscoveries: AttackDiscovery[] =
        parsedResponse.data.attackDiscoveries?.map((attackDiscovery) => ({
          alertIds: [...attackDiscovery.alertIds],
          detailsMarkdown: replaceNewlineLiterals(attackDiscovery.detailsMarkdown),
          entitySummaryMarkdown: replaceNewlineLiterals(attackDiscovery.entitySummaryMarkdown),
          id: uuid.v4(),
          mitreAttackTactics: attackDiscovery.mitreAttackTactics,
          summaryMarkdown: replaceNewlineLiterals(attackDiscovery.summaryMarkdown),
          title: attackDiscovery.title,
        })) ?? [];

      const responseReplacements = parsedResponse.data.replacements ?? {};
      const newReplacements = { ...replacements, ...responseReplacements };

      const newLastUpdated = new Date();

      const newCachedAttackDiscoveries = {
        ...cachedAttackDiscoveries,
        [connectorId ?? '']: {
          connectorId: connectorId ?? '',
          attackDiscoveries: newAttackDiscoveries,
          replacements: newReplacements,
          updated: newLastUpdated,
        },
      };

      setCachedAttackDiscoveries(newCachedAttackDiscoveries);
      setSessionStorageCachedAttackDiscoveries({
        key: sessionStorageKey,
        cachedAttackDiscoveries: newCachedAttackDiscoveries,
      });

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

      const newAlertsContextCount = parsedResponse.data.alertsContextCount ?? null;
      setAlertsContextCount(newAlertsContextCount);

      // only update the generation intervals if alerts were sent as context to the LLM:
      if (newAlertsContextCount != null && newAlertsContextCount > 0) {
        setGenerationIntervals(newGenerationIntervals);
        setLocalStorageGenerationIntervals({
          key: localStorageKey,
          generationIntervals: newGenerationIntervals,
        });
      }

      setReplacements(newReplacements);
      setAttackDiscoveries(newAttackDiscoveries);
      setLastUpdated(newLastUpdated);
      setConnectorId?.(connectorId);
      const connectorConfig = getGenAiConfig(selectedConnector);
      reportAttackDiscoveriesGenerated({
        actionTypeId,
        durationMs,
        alertsContextCount: newAlertsContextCount ?? 0,
        alertsCount: uniq(
          newAttackDiscoveries.flatMap((attackDiscovery) => attackDiscovery.alertIds)
        ).length,
        configuredAlertsCount: knowledgeBase.latestAlerts,
        provider: connectorConfig?.apiProvider,
        model: connectorConfig?.defaultModel,
      });
    } catch (error) {
      toasts?.addDanger(error, {
        title: ERROR_GENERATING_ATTACK_DISCOVERIES,
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
    anonymizationFields,
    cachedAttackDiscoveries,
    connectorId,
    connectorIntervals,
    generationIntervals,
    http,
    knowledgeBase,
    localStorageKey,
    replacements,
    reportAttackDiscoveriesGenerated,
    sessionStorageKey,
    setConnectorId,
    setLoadingConnectorId,
    toasts,
    traceOptions,
  ]);

  return {
    alertsContextCount,
    approximateFutureTime,
    attackDiscoveries,
    cachedAttackDiscoveries,
    fetchAttackDiscoveries,
    generationIntervals,
    isLoading,
    lastUpdated,
    replacements,
  };
};
