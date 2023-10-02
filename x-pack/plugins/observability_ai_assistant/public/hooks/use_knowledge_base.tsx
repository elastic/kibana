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
import type { KnowledgeBaseEntry } from '../../common/types';

interface Foo {
  id: string;
  text: string;
  confidence: 'low' | 'medium' | 'high';
  is_correction: boolean;
  public: boolean;
  labels: {
    [x: string]: string;
  };
}

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
  getEntries: () => Promise<{ entries: KnowledgeBaseEntry[] }>;
  saveEntry: ({ body }: { body: Foo }) => Promise<void>;
  deleteEntry: (entryId: string) => Promise<void>;
}

export function useKnowledgeBase(): UseKnowledgeBaseResult {
  const {
    notifications: { toasts },
  } = useKibana().services;
  const service = useObservabilityAIAssistant();

  const status = useAbortableAsync(({ signal }) => {
    return service.callApi('GET /internal/observability_ai_assistant/kb/status', {
      signal,
    });
  }, []);

  const [isInstalling, setIsInstalling] = useState(false);

  const [installError, setInstallError] = useState<Error>();

  return useMemo(() => {
    let attempts: number = 0;
    const MAX_ATTEMPTS = 5;

    const install = (): Promise<void> => {
      setIsInstalling(true);
      return service
        .callApi('POST /internal/observability_ai_assistant/kb/setup', {
          signal: null,
        })
        .then(() => {
          status.refresh();
          toasts.addSuccess({
            title: i18n.translate('xpack.observabilityAiAssistant.knowledgeBaseReadyTitle', {
              defaultMessage: 'Knowledge base is ready',
            }),
            text: i18n.translate('xpack.observabilityAiAssistant.knowledgeBaseReadyContentReload', {
              defaultMessage: 'A page reload is needed to be able to use it.',
            }),
          });
        })
        .catch((error) => {
          if (
            (error.body?.statusCode === 503 || error.body?.statusCode === 504) &&
            attempts < MAX_ATTEMPTS
          ) {
            attempts++;
            return install();
          }
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
    };

    const getEntries = (): Promise<{ entries: KnowledgeBaseEntry[] }> => {
      return service.callApi('GET /internal/observability_ai_assistant/kb/entries', {
        signal: null,
      });
    };

    const saveEntry = (params: { body: Foo }): Promise<void> => {
      return service.callApi('POST /internal/observability_ai_assistant/kb/entries/save', {
        signal: null,
        params,
      });
    };

    const deleteEntry = (entryId: string): Promise<void> => {
      return service.callApi('DELETE /internal/observability_ai_assistant/kb/entries/{entryId}', {
        signal: null,
        params: {
          path: { entryId },
        },
      });
    };

    return {
      status,
      install,
      getEntries,
      saveEntry,
      deleteEntry,
      isInstalling,
      installError,
    };
  }, [status, isInstalling, installError, service, toasts]);
}
