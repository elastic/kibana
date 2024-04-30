/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext, useMemo } from 'react';
import * as Rx from 'rxjs';
import { i18n } from '@kbn/i18n';
import { AssistantProvider as ElasticAssistantProvider } from '@kbn/elastic-assistant';
import type { CoreTheme } from '@kbn/core/public';
import type { Observable } from 'rxjs';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { AIAssistantDefaults } from '@kbn/elastic-assistant/impl/assistant/prompt_context/types';
import { StartServices } from './types';
import { useAnonymizationStore } from './components/use_anonymization_store';
import { getComments } from './get_comments';
import { augmentMessageCodeBlocks } from './components/helpers';
import { useAssistantAvailability } from './use_assistant_availability';
import { appContextService } from './services/app_context';

const ASSISTANT_TITLE = i18n.translate('xpack.securitySolution.assistant.title', {
  defaultMessage: 'Elastic AI Assistant',
});

export interface IApplicationUsageTracker {
  theme$: Observable<CoreTheme>;
}

export const AssistantProviderContext = createContext<IApplicationUsageTracker | undefined>(
  undefined
);

/**
 * This component configures the Elastic AI Assistant context provider for the Security Solution app.
 */
export function AssistantProvider({
  children,
  theme$,
}: {
  children: React.ReactElement;
  theme$: Observable<CoreTheme>;
}) {
  const theme = useMemo(() => {
    return { theme$ };
  }, [theme$]);
  const {
    http,
    notifications,
    application: applicationService,
    triggersActionsUi: { actionTypeRegistry },
    docLinks: { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION },
  } = useKibana<StartServices>().services;
  const basePath = http.basePath.get();

  const currentAppId = useMemo(() => new Rx.BehaviorSubject(''), []);
  const assistantDefaults = useMemo(
    () => new Rx.BehaviorSubject<AIAssistantDefaults>({ conversations: {} }),
    []
  );
  if (applicationService) {
    applicationService.currentAppId$.subscribe((appId) => {
      if (appId) {
        currentAppId.next(appId);
        assistantDefaults.next(
          appContextService.getRegisteredAIAssistantDefaults(currentAppId.getValue() ?? '')
        );
      }
    });
  }

  const assistantAvailability = useAssistantAvailability();
  // const assistantTelemetry = useAssistantTelemetry();

  /* const onFetchedConversations = useCallback(
    (conversationsData: FetchConversationsResponse): Record<string, Conversation> => {
      const mergedData = mergeBaseWithPersistedConversations({}, conversationsData);
      if (assistantAvailability.isAssistantEnabled && assistantAvailability.hasAssistantPrivilege) {
        migrateConversationsFromLocalStorage(mergedData);
      }
      return mergedData;
    },
    [
      assistantAvailability.hasAssistantPrivilege,
      assistantAvailability.isAssistantEnabled,
      migrateConversationsFromLocalStorage,
    ]
  );
  useFetchCurrentUserConversations({ http, onFetch: onFetchedConversations });
*/

  const { defaultAllow, defaultAllowReplacement, setDefaultAllow, setDefaultAllowReplacement } =
    useAnonymizationStore();

  return (
    <AssistantProviderContext.Consumer>
      {(value) => (
        <KibanaThemeProvider theme={theme}>
          <ElasticAssistantProvider
            actionTypeRegistry={actionTypeRegistry}
            augmentMessageCodeBlocks={augmentMessageCodeBlocks}
            assistantAvailability={assistantAvailability}
            defaultAllow={defaultAllow} // to server and plugin start
            defaultAllowReplacement={defaultAllowReplacement} // to server and plugin start
            docLinks={{ ELASTIC_WEBSITE_URL, DOC_LINK_VERSION }}
            basePath={basePath}
            assistantDefaults={assistantDefaults}
            getComments={getComments}
            http={http}
            currentAppId={currentAppId}
            setDefaultAllow={setDefaultAllow} // remove
            setDefaultAllowReplacement={setDefaultAllowReplacement} // remove
            title={ASSISTANT_TITLE}
            toasts={notifications.toasts}
          >
            {children}
          </ElasticAssistantProvider>
        </KibanaThemeProvider>
      )}
    </AssistantProviderContext.Consumer>
  );
}
