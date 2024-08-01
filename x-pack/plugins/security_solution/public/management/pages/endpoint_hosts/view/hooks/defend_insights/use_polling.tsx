/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { HttpSetup } from '@kbn/core-http-browser';
import type { IToasts } from '@kbn/core-notifications-browser';
import type {
  DefendInsightStats,
  DefendInsightStatus,
  DefendInsightsResponse,
} from '@kbn/elastic-assistant-common';

import {
  DefendInsightsGetResponse,
  ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
} from '@kbn/elastic-assistant-common';

import { ERROR_GENERATING_DEFEND_INSIGHTS } from '../../../../../../app/translations';

export interface Props {
  http: HttpSetup;
  setApproximateFutureTime: (date: Date | null) => void;
  toasts?: IToasts;
  connectorId?: string;
}

export interface DefendInsightsData extends DefendInsightsResponse {
  connectorId: string;
}

interface UsePollDefendInsights {
  didInitialFetch: boolean;
  status: DefendInsightStatus | null;
  data: DefendInsightsData | null;
  stats: DefendInsightStats | null;
  pollApi: () => void;
  setStatus: (status: DefendInsightStatus | null) => void;
}

export const usePollDefendInsights = ({
  http,
  setApproximateFutureTime,
  toasts,
  connectorId,
}: Props): UsePollDefendInsights => {
  const [status, setStatus] = useState<DefendInsightStatus | null>(null);
  const [stats, setStats] = useState<DefendInsightStats | null>(null);
  const [data, setData] = useState<DefendInsightsData | null>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectorIdRef = useRef<string | undefined>(undefined);

  const [didInitialFetch, setDidInitialFetch] = useState(false);

  useEffect(() => {
    connectorIdRef.current = connectorId;
    setDidInitialFetch(false);
    return () => {
      connectorIdRef.current = undefined;
      // when a connectorId changes, clear timeout
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    };
  }, [connectorId]);

  const handleResponse = useCallback(
    (responseData: DefendInsightsResponse | null) => {
      if (connectorId == null || connectorId === '') {
        throw new Error('Invalid connector id');
      }
      setDidInitialFetch(true);
      if (responseData == null) {
        setStatus(null);
        setData(null);
        return;
      }
      setData((prevData) => {
        if (
          responseData.updatedAt === prevData?.updatedAt &&
          responseData.status === prevData?.status &&
          responseData.id === prevData?.id
        ) {
          // do not update if the data is the same
          // prevents unnecessary re-renders
          return prevData;
        }
        setStatus(responseData.status);
        setApproximateFutureTime(
          moment(responseData.updatedAt)
            .add(responseData.averageIntervalMs, 'milliseconds')
            .toDate()
        );
        return {
          ...responseData,
          connectorId,
        };
      });
    },
    [connectorId, setApproximateFutureTime]
  );

  const pollApi = useCallback(async () => {
    try {
      if (connectorId == null || connectorId === '') {
        throw new Error('Invalid connector id');
      }
      // edge case - clearTimeout does not always work in time
      // so we need to check if the connectorId has changed
      if (connectorId !== connectorIdRef.current) {
        return;
      }
      const rawResponse = await http.fetch(
        `/internal/elastic_assistant/defend_insights/${connectorId}`,
        {
          method: 'GET',
          version: ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
        }
      );

      const parsedResponse = DefendInsightsGetResponse.safeParse(rawResponse);
      if (!parsedResponse.success) {
        throw new Error('Failed to parse the Defend insights GET response');
      }
      // ensure component did not unmount before setting state
      if (connectorIdRef.current) {
        handleResponse(parsedResponse.data.data ?? null);
        const allStats = parsedResponse.data.stats.reduce(
          (acc, ad) => {
            return {
              ...acc,
              newConnectorResultsCount:
                !ad.hasViewed && (ad.status === 'succeeded' || ad.status === 'failed')
                  ? acc.newConnectorResultsCount + 1
                  : acc.newConnectorResultsCount,
              newDiscoveriesCount:
                !ad.hasViewed && ad.status === 'succeeded'
                  ? acc.newDiscoveriesCount + ad.count
                  : acc.newDiscoveriesCount,
            };
          },
          {
            newDiscoveriesCount: 0,
            newConnectorResultsCount: 0,
            statsPerConnector: parsedResponse.data.stats,
          }
        );
        setStats(allStats);
        // poll every 5 seconds, regardless if current connector is running. Need stats object for connector dropdown stats
        timeoutIdRef.current = setTimeout(() => {
          pollApi();
        }, 5000);
      }
    } catch (error) {
      setStatus(null);
      setData(null);

      toasts?.addDanger(error, {
        title: ERROR_GENERATING_DEFEND_INSIGHTS,
        text: error.message,
      });
    }
  }, [connectorId, handleResponse, http, toasts]);

  return {
    didInitialFetch,
    status,
    data,
    pollApi,
    stats,
    setStatus,
  };
};

export const defendInsightStatus: { [k: string]: DefendInsightStatus } = {
  canceled: 'canceled',
  failed: 'failed',
  running: 'running',
  succeeded: 'succeeded',
};
