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
  AttackDiscoveryGetResponse,
  ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
} from '@kbn/elastic-assistant-common';
import type { HttpSetup } from '@kbn/core-http-browser';
import moment from 'moment';
import type { IToasts } from '@kbn/core-notifications-browser';
import { ERROR_GENERATING_ATTACK_DISCOVERIES } from '../pages/translations';
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

export const usePollApi = ({
  http,
  setApproximateFutureTime,
  toasts,
  connectorId,
}: Props): {
  status: AttackDiscoveryStatus | null;
  data: AttackDiscoveryData | null;
  pollApi: () => void;
} => {
  const [status, setStatus] = useState<AttackDiscoveryStatus | null>(null);
  const [data, setData] = useState<AttackDiscoveryData | null>(null);
  const currentConnectorId = useRef<string | undefined>(undefined);

  useEffect(() => {
    currentConnectorId.current = connectorId;
    return () => {
      currentConnectorId.current = undefined;
    };
  }, [connectorId]);

  const handleResponse = useCallback(
    (responseData: AttackDiscoveryResponse) => {
      if (connectorId == null || connectorId === '') {
        throw new Error('Invalid connector id');
      }
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
      if (parsedResponse.data.entryExists === false || parsedResponse.data.data == null) {
        setStatus(null);
        setData(null);
      } else if (
        parsedResponse.data.data.status === attackDiscoveryStatus.succeeded ||
        parsedResponse.data.data.status === attackDiscoveryStatus.failed
      ) {
        handleResponse(parsedResponse.data.data);
      } else if (parsedResponse.data.data.status === attackDiscoveryStatus.running) {
        handleResponse(parsedResponse.data.data);
        // poll every 3 seconds if attack discovery is running
        setTimeout(() => {
          // react is being annoying and the setTimeout is still running after the connectorId changes
          if (currentConnectorId.current === connectorId) pollApi();
        }, 3000);
      } else {
        throw new Error('Invalid status from attack discovery GET response');
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

  return { status, data, pollApi };
};

export const attackDiscoveryStatus: { [k: string]: AttackDiscoveryStatus } = {
  failed: 'failed',
  running: 'running',
  succeeded: 'succeeded',
};
