/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type { AttackDiscoveryStatus, AttackDiscoveryResponse } from '@kbn/elastic-assistant-common';
import {
  AttackDiscoveryGetResponse,
  ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
} from '@kbn/elastic-assistant-common';
import type { HttpSetup } from '@kbn/core-http-browser';

export interface Props {
  http: HttpSetup;
  // toasts?: IToasts;
}

export const usePollApi = ({
  http,
}: Props): {
  status: AttackDiscoveryStatus | null;
  data: AttackDiscoveryGetResponse | null;
  error: string | null;
  pollApi: (connectorId: string) => void;
} => {
  const [status, setStatus] = useState<AttackDiscoveryStatus | null>(null);
  const [data, setData] = useState<AttackDiscoveryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollApi = useCallback(
    async (connectorId: string) => {
      try {
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
          throw new Error('Failed to parse the response');
        }
        if (parsedResponse.data.entryExists === false || parsedResponse.data.data == null) {
          setStatus(null);
          setData(null);
        } else if (
          parsedResponse.data.data.status === attackDiscoveryStatus.succeeded ||
          parsedResponse.data.data.status === attackDiscoveryStatus.failed
        ) {
          setStatus(parsedResponse.data.data.status);
          setData(parsedResponse.data.data);
        } else if (parsedResponse.data.data.status === attackDiscoveryStatus.running) {
          // poll every 3 seconds if attack discovery is running
          setTimeout(pollApi, 3000);
        } else {
          setError('Unexpected status');
        }
      } catch (err) {
        setError(err);
      }
    },
    [http]
  );

  return { status, data, error, pollApi };
};

export const attackDiscoveryStatus: { [k: string]: AttackDiscoveryStatus } = {
  failed: 'failed',
  running: 'running',
  succeeded: 'succeeded',
};
