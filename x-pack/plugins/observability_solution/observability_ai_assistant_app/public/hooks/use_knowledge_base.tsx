/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type {
  MlDeploymentAllocationState,
  MlDeploymentState,
} from '@elastic/elasticsearch/lib/api/types';
import { useMemo, useState } from 'react';
import {
  type AbortableAsyncState,
  useAbortableAsync,
} from '@kbn/observability-ai-assistant-plugin/public';
import { useKibana } from './use_kibana';
import { useObservabilityAIAssistantAppService } from './use_observability_ai_assistant_app_service';

export interface UseKnowledgeBaseResult {
  status: AbortableAsyncState<{
    ready: boolean;
    error?: any;
    deployment_state?: MlDeploymentState;
    allocation_state?: MlDeploymentAllocationState;
    model_name?: string;
  }>;
  isInstalling: boolean;
  installError?: Error;
  install: () => Promise<void>;
}

export function useKnowledgeBase(): UseKnowledgeBaseResult {
  const {
    notifications: { toasts },
    plugins: {
      start: { ml },
    },
  } = useKibana().services;
  const service = useObservabilityAIAssistantAppService();

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
        .then(() => ml.mlApi?.savedObjects.syncSavedObjects())
        .then(() => {
          status.refresh();
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

    return {
      status,
      install,
      isInstalling,
      installError,
    };
  }, [status, isInstalling, installError, service, ml.mlApi?.savedObjects, toasts]);
}
