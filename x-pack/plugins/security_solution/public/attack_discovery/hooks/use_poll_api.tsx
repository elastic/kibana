/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import * as uuid from 'uuid';
import type { AttackDiscoveryStatus, AttackDiscoveryResponse } from '@kbn/elastic-assistant-common';
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
  didInitialFetch: boolean;
  status: AttackDiscoveryStatus | null;
  data: AttackDiscoveryData | null;
  pollApi: () => void;
}

export const usePollApi = ({
  http,
  setApproximateFutureTime,
  toasts,
  connectorId,
}: Props): UsePollApi => {
  const [status, setStatus] = useState<AttackDiscoveryStatus | null>(null);
  const [data, setData] = useState<AttackDiscoveryData | null>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [didInitialFetch, setDidInitialFetch] = useState(false);

  useEffect(() => {
    setDidInitialFetch(false);
    return () => {
      // when a connectorId changes, clear timeout
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    };
  }, [connectorId]);

  const handleResponse = useCallback(
    (responseData: AttackDiscoveryResponse | null) => {
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
          attackDiscoveries: responseData.attackDiscoveries.map((attackDiscovery) => ({
            ...attackDiscovery,
            id: attackDiscovery.id ?? uuid.v4(),
            detailsMarkdown: replaceNewlineLiterals(attackDiscovery.detailsMarkdown),
            entitySummaryMarkdown: replaceNewlineLiterals(attackDiscovery.entitySummaryMarkdown),
            summaryMarkdown: replaceNewlineLiterals(attackDiscovery.summaryMarkdown),
          })),
        };
      });
    },
    [connectorId, setApproximateFutureTime]
  );

  const cancelAttackDiscovery = useCallback(async () => {
    try {
      if (connectorId == null || connectorId === '') {
        throw new Error('Invalid connector id');
      }
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
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
      if (parsedResponse?.data?.data?.status === attackDiscoveryStatus.running) {
        // poll every 3 seconds if attack discovery is running
        timeoutIdRef.current = setTimeout(() => {
          pollApi();
        }, 3000);
      }
    } catch (error) {
      setStatus(null);
      setData(null);

      toasts?.addDanger(error, {
        title: ERROR_GENERATING_ATTACK_DISCOVERIES,
        text: getErrorToastText(error),
      });
    }
  }, [connectorId, handleResponse, http, toasts]);

  return { cancelAttackDiscovery, didInitialFetch, status, data, pollApi };
};

export const attackDiscoveryStatus: { [k: string]: AttackDiscoveryStatus } = {
  canceled: 'canceled',
  failed: 'failed',
  running: 'running',
  succeeded: 'succeeded',
};
