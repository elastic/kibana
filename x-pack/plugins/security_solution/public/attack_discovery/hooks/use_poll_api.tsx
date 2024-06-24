/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import * as uuid from 'uuid';
import type {
  AttackDiscoveryStats,
  AttackDiscoveryStatus,
  AttackDiscoveryResponse,
} from '@kbn/elastic-assistant-common';
import {
  AttackDiscoveryCancelResponse,
  AttackDiscoveryGetResponse,
  ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
} from '@kbn/elastic-assistant-common';
import type { HttpSetup } from '@kbn/core-http-browser';
import moment from 'moment';
import type { IToasts } from '@kbn/core-notifications-browser';
import {
  ERROR_CANCELING_ATTACK_DISCOVERIES,
  ERROR_GENERATING_ATTACK_DISCOVERIES,
} from '../pages/translations';
import { getErrorToastText } from '../pages/helpers';
import { replaceNewlineLiterals } from '../helpers';

export interface Props {
  http: HttpSetup;
  setApproximateFutureTime: (date: Date | null) => void;
  toasts?: IToasts;
  connectorId?: string;
}

export interface AttackDiscoveryData extends AttackDiscoveryResponse {
  connectorId: string;
}

interface UsePollApi {
  cancelAttackDiscovery: () => Promise<void>;
  status: AttackDiscoveryStatus | null;
  data: AttackDiscoveryData | null;
  stats: AttackDiscoveryStats | null;
  pollApi: () => void;
}

export const usePollApi = ({
  http,
  setApproximateFutureTime,
  toasts,
  connectorId,
}: Props): UsePollApi => {
  const [status, setStatus] = useState<AttackDiscoveryStatus | null>(null);
  const [stats, setStats] = useState<AttackDiscoveryStats | null>(null);
  const [data, setData] = useState<AttackDiscoveryData | null>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectorIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    connectorIdRef.current = connectorId;
    return () => {
      console.log('DISMOUNT connectorId??????', {
        currentTimeout: timeoutIdRef.current,
        connectorId,
      });
      connectorIdRef.current = undefined;
      // when a connectorId changes, clear timeout
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    };
  }, [connectorId]);

  const handleResponse = useCallback(
    (responseData: AttackDiscoveryResponse | null) => {
      if (connectorId == null || connectorId === '') {
        throw new Error('Invalid connector id');
      }
      if (responseData == null) {
        setStatus(null);
        setData(null);
        return;
      }
      console.log('handleResponse', responseData);
      setStatus(responseData.status);
      setApproximateFutureTime(
        moment(responseData.updatedAt).add(responseData.averageIntervalMs, 'milliseconds').toDate()
      );
      setData({
        ...responseData,
        connectorId,
        attackDiscoveries: responseData.attackDiscoveries.map((attackDiscovery) => ({
          ...attackDiscovery,
          id: attackDiscovery.id ?? uuid.v4(),
          detailsMarkdown: replaceNewlineLiterals(attackDiscovery.detailsMarkdown),
          entitySummaryMarkdown: replaceNewlineLiterals(attackDiscovery.entitySummaryMarkdown),
          summaryMarkdown: replaceNewlineLiterals(attackDiscovery.summaryMarkdown),
        })),
      });
    },
    [connectorId, setApproximateFutureTime]
  );

  const cancelAttackDiscovery = useCallback(async () => {
    try {
      if (connectorId == null || connectorId === '') {
        throw new Error('Invalid connector id');
      }
      // if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      const rawResponse = await http.fetch(
        `/internal/elastic_assistant/attack_discovery/cancel/${connectorId}`,
        {
          method: 'PUT',
          version: ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
        }
      );
      const parsedResponse = AttackDiscoveryCancelResponse.safeParse(rawResponse);
      if (!parsedResponse.success) {
        throw new Error('Failed to parse the attack discovery cancel response');
      }
      handleResponse(parsedResponse.data);
    } catch (error) {
      setStatus(null);

      toasts?.addDanger(error, {
        title: ERROR_CANCELING_ATTACK_DISCOVERIES,
        text: getErrorToastText(error),
      });
    }
  }, [connectorId, handleResponse, http, toasts]);

  const pollApi = useCallback(async () => {
    try {
      if (connectorId == null || connectorId === '') {
        throw new Error('Invalid connector id');
      }
      // clearTimeout not working
      if (connectorId !== connectorIdRef.current) {
        return;
      }
      // call the internal API to generate attack discoveries:
      const rawResponse = await http.fetch(
        `/internal/elastic_assistant/attack_discovery/${connectorId}`,
        {
          method: 'GET',
          version: ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
        }
      );

      const parsedResponse = AttackDiscoveryGetResponse.safeParse(rawResponse);
      if (!parsedResponse.success) {
        throw new Error('Failed to parse the attack discovery GET response');
      }
      handleResponse(parsedResponse.data.data ?? null);
      setStats(parsedResponse.data.stats);
      // poll every 5 seconds, regardless if current connector is running. Need stats object for connector dropdown stats
      console.log('connectorIds', {
        connectorId,
        connectorIdRef: connectorIdRef.current,
      });
      console.log('timeoutIdRef.current before', timeoutIdRef.current);
      timeoutIdRef.current = setTimeout(() => {
        pollApi();
      }, 5000);
      console.log('timeoutIdRef.current after', timeoutIdRef.current);
    } catch (error) {
      setStatus(null);
      setData(null);

      toasts?.addDanger(error, {
        title: ERROR_GENERATING_ATTACK_DISCOVERIES,
        text: getErrorToastText(error),
      });
    }
  }, [connectorId, handleResponse, http, toasts]);
  // const returnValue = useMemo(() => {
  //   console.log('returnValue', { cancelAttackDiscovery, status, data, pollApi, stats });
  //   return { cancelAttackDiscovery, status, data, pollApi, stats };
  // }, [cancelAttackDiscovery, status, data, pollApi, stats]);

  return { cancelAttackDiscovery, status, data, pollApi, stats };
};

export const attackDiscoveryStatus: { [k: string]: AttackDiscoveryStatus } = {
  canceled: 'canceled',
  failed: 'failed',
  running: 'running',
  succeeded: 'succeeded',
};
