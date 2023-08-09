/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState } from 'react';
import { AbortableAsyncState, useAbortableAsync } from './use_abortable_async';
import { useObservabilityAIAssistant } from './use_observability_ai_assistant';

export interface UseKnowledgeBaseResult {
  status: AbortableAsyncState<{
    ready: boolean;
    error?: any;
    deployment_state?: string;
    allocation_state?: string;
  }>;
  isInstalling: boolean;
  installError?: Error;
  install: () => Promise<void>;
}

export function useKnowledgeBase(): UseKnowledgeBaseResult {
  const service = useObservabilityAIAssistant();

  const status = useAbortableAsync(({ signal }) => {
    return service.callApi('GET /internal/observability_ai_assistant/functions/kb_status', {
      signal,
    });
  }, []);

  const [isInstalling, setIsInstalling] = useState(false);

  const [installError, setInstallError] = useState<Error>();

  return useMemo(
    () => ({
      status,
      isInstalling,
      installError,
      install: () => {
        setIsInstalling(true);
        return service
          .callApi('POST /internal/observability_ai_assistant/functions/setup_kb', {
            signal: null,
          })
          .then(() => {
            status.refresh();
          })
          .catch((error) => {
            setInstallError(error);
          })
          .finally(() => {
            setIsInstalling(true);
          });
      },
    }),
    [status, service, isInstalling, installError]
  );
}
