/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMemo, useState } from 'react';
import { AbortableAsyncState, useAbortableAsync } from './use_abortable_async';
import { useKibana } from './use_kibana';
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
  const {
    notifications: { toasts },
  } = useKibana().services;
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
            toasts.addError(error, {
              title: i18n.translate('xpack.observabilityAiAssistant.errorSettingUpKnowledgeBase', {
                defaultMessage: 'Could not set up Knowledge Base',
              }),
            });
          })
          .finally(() => {
            setIsInstalling(false);
          });
      },
    }),
    [status, isInstalling, installError, service, toasts]
  );
}
