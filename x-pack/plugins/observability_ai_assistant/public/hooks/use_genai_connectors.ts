/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { FindActionResult } from '@kbn/actions-plugin/server';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useObservabilityAIAssistant } from './use_observability_ai_assistant';

export interface UseGenAIConnectorsResult {
  connectors?: FindActionResult[];
  selectedConnector?: string;
  loading: boolean;
  error?: Error;
  selectConnector: (id: string) => void;
}

export function useGenAIConnectors(): UseGenAIConnectorsResult {
  const assistant = useObservabilityAIAssistant();

  const [connectors, setConnectors] = useState<FindActionResult[] | undefined>(undefined);

  const [selectedConnector, setSelectedConnector] = useLocalStorage(
    `xpack.observabilityAiAssistant.lastUsedConnector`,
    ''
  );

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    setLoading(true);

    const controller = new AbortController();

    assistant
      .callApi('GET /internal/observability_ai_assistant/connectors', {
        signal: controller.signal,
      })
      .then((results) => {
        setConnectors(results);
        setSelectedConnector((connectorId) => {
          if (connectorId && results.findIndex((result) => result.id === connectorId) === -1) {
            return '';
          }
          return connectorId;
        });

        setError(undefined);
      })
      .catch((err) => {
        setError(err);
        setConnectors(undefined);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [assistant, setSelectedConnector]);

  return {
    connectors,
    loading,
    error,
    selectedConnector: selectedConnector || connectors?.[0]?.id,
    selectConnector: (id: string) => {
      setSelectedConnector(id);
    },
  };
}
