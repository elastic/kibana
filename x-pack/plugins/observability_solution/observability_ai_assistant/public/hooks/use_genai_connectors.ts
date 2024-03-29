/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { useCallback, useEffect, useState } from 'react';
import type { FindActionResult } from '@kbn/actions-plugin/server';
import { aiAssistantDefaultConnector } from '../../common/utils/advanced_settings';
import type { ObservabilityAIAssistantService } from '../types';
import { useObservabilityAIAssistant } from './use_observability_ai_assistant';
import { useKibana } from './use_kibana';

export interface UseGenAIConnectorsResult {
  connectors?: FindActionResult[];
  selectedConnector?: string;
  loading: boolean;
  error?: Error;
  selectConnector: (id: string) => void;
  reloadConnectors: () => void;
}

export function useGenAIConnectors(): UseGenAIConnectorsResult {
  const assistant = useObservabilityAIAssistant();
  const { services } = useKibana();

  return useGenAIConnectorsWithoutContext(assistant, services);
}

export function useGenAIConnectorsWithoutContext(
  assistant: ObservabilityAIAssistantService,
  coreStart: CoreStart
): UseGenAIConnectorsResult {
  const { uiSettings } = coreStart;
  const [connectors, setConnectors] = useState<FindActionResult[] | undefined>(undefined);

  const savedConnector = uiSettings.get<string>(aiAssistantDefaultConnector, '');
  const [selectedConnector, setSelectedConnector] = useState<string>(savedConnector);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  const fetchAndSetConnectors = useCallback(async () => {
    setLoading(true);

    try {
      const results = await assistant.callApi(
        'GET /internal/observability_ai_assistant/connectors',
        { signal: null }
      );

      setConnectors(results);

      if (!selectedConnector) {
        const firstConnectorId = results[0]?.id;
        setSelectedConnector(firstConnectorId);
      }

      setError(undefined);
    } catch (err) {
      setError(err);
      setConnectors(undefined);
    } finally {
      setLoading(false);
    }
  }, [assistant, selectedConnector]);

  useEffect(() => {
    fetchAndSetConnectors();
  }, [fetchAndSetConnectors]);

  return {
    connectors,
    loading,
    error,
    selectedConnector,
    selectConnector: setSelectedConnector,
    reloadConnectors: fetchAndSetConnectors,
  };
}
