/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AssistantProvider } from '@kbn/elastic-assistant';
import type { History } from 'history';
import type { FC } from 'react';
import React, { memo, useCallback } from 'react';
import type { Store, Action } from 'redux';
import { Provider as ReduxStoreProvider } from 'react-redux';

import { EuiErrorBoundary } from '@elastic/eui';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import type { AppLeaveHandler, AppMountParameters } from '@kbn/core/public';

import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { CellActionsProvider } from '@kbn/cell-actions';

import { NavigationProvider } from '@kbn/security-solution-navigation';
import { UpsellingProvider } from '../common/components/upselling_provider';
import { useAssistantTelemetry } from '../assistant/use_assistant_telemetry';
import { getComments } from '../assistant/get_comments';
import { augmentMessageCodeBlocks, LOCAL_STORAGE_KEY } from '../assistant/helpers';
import { useConversationStore } from '../assistant/use_conversation_store';
import { ManageUserInfo } from '../detections/components/user_info';
import { DEFAULT_DARK_MODE, APP_NAME, APP_ID } from '../../common/constants';
import { ErrorToastDispatcher } from '../common/components/error_toast_dispatcher';
import { MlCapabilitiesProvider } from '../common/components/ml/permissions/ml_capabilities_provider';
import { GlobalToaster, ManageGlobalToaster } from '../common/components/toasters';
import { KibanaContextProvider, useKibana, useUiSetting$ } from '../common/lib/kibana';
import type { State } from '../common/store';
import { ASSISTANT_TITLE } from './translations';
import type { StartServices } from '../types';
import { PageRouter } from './routes';
import { UserPrivilegesProvider } from '../common/components/user_privileges/user_privileges_context';
import { ReactQueryClientProvider } from '../common/containers/query_client/query_client_provider';
import { DEFAULT_ALLOW, DEFAULT_ALLOW_REPLACEMENT } from '../assistant/content/anonymization';
import { PROMPT_CONTEXTS } from '../assistant/content/prompt_contexts';
import { BASE_SECURITY_QUICK_PROMPTS } from '../assistant/content/quick_prompts';
import { BASE_SECURITY_SYSTEM_PROMPTS } from '../assistant/content/prompts/system';
import { useAnonymizationStore } from '../assistant/use_anonymization_store';

interface StartAppComponent {
  children: React.ReactNode;
  history: History;
  onAppLeave: (handler: AppLeaveHandler) => void;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  store: Store<State, Action>;
  theme$: AppMountParameters['theme$'];
}

const StartAppComponent: FC<StartAppComponent> = ({
  children,
  history,
  setHeaderActionMenu,
  onAppLeave,
  store,
  theme$,
}) => {
  const services = useKibana().services;
  const {
    i18n,
    application: { capabilities },
    http,
    triggersActionsUi: { actionTypeRegistry },
    uiActions,
    upselling,
  } = services;

  const { conversations, setConversations } = useConversationStore();
  const { defaultAllow, defaultAllowReplacement, setDefaultAllow, setDefaultAllowReplacement } =
    useAnonymizationStore();

  const getInitialConversation = useCallback(() => {
    return conversations;
  }, [conversations]);

  const nameSpace = `${APP_ID}.${LOCAL_STORAGE_KEY}`;

  const [darkMode] = useUiSetting$<boolean>(DEFAULT_DARK_MODE);

  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = useKibana().services.docLinks;

  const assistantTelemetry = useAssistantTelemetry();

  return (
    <EuiErrorBoundary>
      <i18n.Context>
        <ManageGlobalToaster>
          <ReduxStoreProvider store={store}>
            <KibanaThemeProvider theme$={theme$}>
              <EuiThemeProvider darkMode={darkMode}>
                <AssistantProvider
                  actionTypeRegistry={actionTypeRegistry}
                  augmentMessageCodeBlocks={augmentMessageCodeBlocks}
                  assistantTelemetry={assistantTelemetry}
                  defaultAllow={defaultAllow}
                  defaultAllowReplacement={defaultAllowReplacement}
                  docLinks={{ ELASTIC_WEBSITE_URL, DOC_LINK_VERSION }}
                  baseAllow={DEFAULT_ALLOW}
                  baseAllowReplacement={DEFAULT_ALLOW_REPLACEMENT}
                  basePromptContexts={Object.values(PROMPT_CONTEXTS)}
                  baseQuickPrompts={BASE_SECURITY_QUICK_PROMPTS}
                  baseSystemPrompts={BASE_SECURITY_SYSTEM_PROMPTS}
                  getInitialConversations={getInitialConversation}
                  getComments={getComments}
                  http={http}
                  nameSpace={nameSpace}
                  setConversations={setConversations}
                  setDefaultAllow={setDefaultAllow}
                  setDefaultAllowReplacement={setDefaultAllowReplacement}
                  title={ASSISTANT_TITLE}
                >
                  <MlCapabilitiesProvider>
                    <UserPrivilegesProvider kibanaCapabilities={capabilities}>
                      <ManageUserInfo>
                        <NavigationProvider core={services}>
                          <ReactQueryClientProvider>
                            <CellActionsProvider
                              getTriggerCompatibleActions={uiActions.getTriggerCompatibleActions}
                            >
                              <UpsellingProvider upsellingService={upselling}>
                                <PageRouter
                                  history={history}
                                  onAppLeave={onAppLeave}
                                  setHeaderActionMenu={setHeaderActionMenu}
                                >
                                  {children}
                                </PageRouter>
                              </UpsellingProvider>
                            </CellActionsProvider>
                          </ReactQueryClientProvider>
                        </NavigationProvider>
                      </ManageUserInfo>
                    </UserPrivilegesProvider>
                  </MlCapabilitiesProvider>
                </AssistantProvider>
              </EuiThemeProvider>
            </KibanaThemeProvider>
            <ErrorToastDispatcher />
            <GlobalToaster />
          </ReduxStoreProvider>
        </ManageGlobalToaster>
      </i18n.Context>
    </EuiErrorBoundary>
  );
};

const StartApp = memo(StartAppComponent);

interface SecurityAppComponentProps {
  children: React.ReactNode;
  history: History;
  onAppLeave: (handler: AppLeaveHandler) => void;
  services: StartServices;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  store: Store<State, Action>;
  theme$: AppMountParameters['theme$'];
}

const SecurityAppComponent: React.FC<SecurityAppComponentProps> = ({
  children,
  history,
  onAppLeave,
  services,
  setHeaderActionMenu,
  store,
  theme$,
}) => {
  const CloudProvider = services.cloud?.CloudContextProvider ?? React.Fragment;

  return (
    <KibanaContextProvider
      services={{
        appName: APP_NAME,
        ...services,
      }}
    >
      <CloudProvider>
        <StartApp
          history={history}
          onAppLeave={onAppLeave}
          setHeaderActionMenu={setHeaderActionMenu}
          store={store}
          theme$={theme$}
        >
          {children}
        </StartApp>
      </CloudProvider>
    </KibanaContextProvider>
  );
};

export const SecurityApp = memo(SecurityAppComponent);
