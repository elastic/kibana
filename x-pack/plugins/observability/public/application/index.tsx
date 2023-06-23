/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAvatar,
  EuiButtonIcon,
  EuiCommentProps,
  EuiCopy,
  EuiErrorBoundary,
  EuiMarkdownFormat,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import React, { useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Router, Switch } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { Route } from '@kbn/shared-ux-router';
import { AppMountParameters, APP_WRAPPER_CLASS, CoreStart } from '@kbn/core/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import {
  KibanaContextProvider,
  KibanaThemeProvider,
  RedirectAppLinks,
} from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { useLocalStorage } from 'react-use/lib';
import { AssistantOverlay, AssistantProvider, Conversation } from '@kbn/elastic-assistant';

import { HasDataContextProvider } from '../context/has_data_context/has_data_context';
import { PluginContext } from '../context/plugin_context/plugin_context';
import { ConfigSchema, ObservabilityPublicPluginsStart } from '../plugin';
import { routes } from '../routes';
import { ObservabilityRuleTypeRegistry } from '../rules/create_observability_rule_type_registry';
import { HideableReactQueryDevTools } from './hideable_react_query_dev_tools';
import {
  BASE_OBSERVABILITY_CONVERSATIONS,
  BASE_OBSERVABILITY_QUICK_PROMPTS,
  BASE_SYSTEM_PROMPTS,
} from '../assistant/conversations';
import { ELASTIC_OBSERVABILITY_ASSISTANT } from '../assistant/translations';
import { useKibana } from '../utils/kibana_react';

function App() {
  const {
    http,
    triggersActionsUi: { actionTypeRegistry },
  } = useKibana().services;

  /**
   * Elastic Assistant Discover Integration
   */
  // Local storage for saving Discover Conversations
  const [localStorageConversations, setLocalStorageConversations] = useLocalStorage(
    `observability.observabilityAssistant`,
    BASE_OBSERVABILITY_CONVERSATIONS
  );

  const getInitialConversation = useCallback(() => {
    return localStorageConversations ?? {};
  }, [localStorageConversations]);

  // Solution Specific Comment Rendering
  const getComments = useCallback(
    ({
      currentConversation,
      lastCommentRef,
    }: {
      currentConversation: Conversation;
      lastCommentRef: React.MutableRefObject<HTMLDivElement | null>;
    }): EuiCommentProps[] =>
      currentConversation.messages.map((message, index) => {
        const isUser = message.role === 'user';

        return {
          actions: (
            <EuiToolTip position="top" content={'Copy'}>
              <EuiCopy textToCopy={message.content}>
                {(copy) => (
                  <EuiButtonIcon
                    aria-label={'Copy'}
                    color="primary"
                    iconType="copyClipboard"
                    onClick={copy}
                  />
                )}
              </EuiCopy>
            </EuiToolTip>
          ),
          children:
            index !== currentConversation.messages.length - 1 ? (
              <EuiText>
                <EuiMarkdownFormat className={`message-${index}`}>
                  {message.content}
                </EuiMarkdownFormat>
              </EuiText>
            ) : (
              <EuiText>
                <EuiMarkdownFormat className={`message-${index}`}>
                  {message.content}
                </EuiMarkdownFormat>
                <span ref={lastCommentRef} />
              </EuiText>
            ),
          timelineAvatar: isUser ? (
            <EuiAvatar name="user" size="l" color="subdued" iconType="userAvatar" />
          ) : (
            <EuiAvatar name="machine" size="l" color="subdued" iconType="logoObservability" />
          ),
          timestamp: `at ${message.timestamp}`,
          username: isUser ? 'You' : 'Assistant',
        };
      }),
    []
  );

  return (
    <AssistantProvider
      actionTypeRegistry={actionTypeRegistry}
      augmentMessageCodeBlocks={() => []}
      baseQuickPrompts={BASE_OBSERVABILITY_QUICK_PROMPTS}
      baseSystemPrompts={BASE_SYSTEM_PROMPTS}
      getComments={getComments}
      getInitialConversations={getInitialConversation}
      http={http}
      nameSpace={'observability'}
      setConversations={setLocalStorageConversations}
      title={ELASTIC_OBSERVABILITY_ASSISTANT}
    >
      <AssistantOverlay />
      <Switch>
        {Object.keys(routes).map((key) => {
          const path = key as keyof typeof routes;
          const { handler, exact } = routes[path];
          const Wrapper = () => {
            return handler();
          };
          return <Route key={path} path={path} exact={exact} component={Wrapper} />;
        })}
      </Switch>
    </AssistantProvider>
  );
}

export const renderApp = ({
  core,
  config,
  plugins,
  appMountParameters,
  observabilityRuleTypeRegistry,
  ObservabilityPageTemplate,
  usageCollection,
  isDev,
  kibanaVersion,
}: {
  core: CoreStart;
  config: ConfigSchema;
  plugins: ObservabilityPublicPluginsStart;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
  appMountParameters: AppMountParameters;
  ObservabilityPageTemplate: React.ComponentType<LazyObservabilityPageTemplateProps>;
  usageCollection: UsageCollectionSetup;
  isDev?: boolean;
  kibanaVersion: string;
}) => {
  const { element, history, theme$ } = appMountParameters;
  const i18nCore = core.i18n;
  const isDarkMode = core.uiSettings.get('theme:darkMode');

  core.chrome.setHelpExtension({
    appName: i18n.translate('xpack.observability.feedbackMenu.appName', {
      defaultMessage: 'Observability',
    }),
    links: [{ linkType: 'discuss', href: 'https://ela.st/observability-discuss' }],
  });

  // ensure all divs are .kbnAppWrappers
  element.classList.add(APP_WRAPPER_CLASS);

  const queryClient = new QueryClient();

  const ApplicationUsageTrackingProvider =
    usageCollection?.components.ApplicationUsageTrackingProvider ?? React.Fragment;
  ReactDOM.render(
    <EuiErrorBoundary>
      <ApplicationUsageTrackingProvider>
        <KibanaThemeProvider theme$={theme$}>
          <KibanaContextProvider
            services={{
              ...core,
              ...plugins,
              storage: new Storage(localStorage),
              isDev,
              kibanaVersion,
            }}
          >
            <PluginContext.Provider
              value={{
                config,
                appMountParameters,
                observabilityRuleTypeRegistry,
                ObservabilityPageTemplate,
              }}
            >
              <Router history={history}>
                <EuiThemeProvider darkMode={isDarkMode}>
                  <i18nCore.Context>
                    <RedirectAppLinks application={core.application} className={APP_WRAPPER_CLASS}>
                      <QueryClientProvider client={queryClient}>
                        <HasDataContextProvider>
                          <App />
                        </HasDataContextProvider>
                        <HideableReactQueryDevTools />
                      </QueryClientProvider>
                    </RedirectAppLinks>
                  </i18nCore.Context>
                </EuiThemeProvider>
              </Router>
            </PluginContext.Provider>
          </KibanaContextProvider>
        </KibanaThemeProvider>
      </ApplicationUsageTrackingProvider>
    </EuiErrorBoundary>,
    element
  );
  return () => {
    // This needs to be present to fix https://github.com/elastic/kibana/issues/155704
    // as the Overview page renders the UX Section component. That component renders a Lens embeddable
    // via the ExploratoryView app, which uses search sessions. Therefore on unmounting we need to clear
    // these sessions.
    plugins.data.search.session.clear();
    ReactDOM.unmountComponentAtNode(element);
  };
};
