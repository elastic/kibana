/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiTab, EuiTabs, EuiTitle } from '@elastic/eui';
import { useAppContext } from '../../hooks/use_app_context';
import { SettingsTab } from './settings_tab';
import { KnowledgeBaseTab } from './knowledge_base_tab';
import { useObservabilityAIAssistantManagementRouterParams } from '../../hooks/use_observability_management_params';
import { useObservabilityAIAssistantManagementRouter } from '../../hooks/use_observability_management_router';
import type { TabsRt } from '../config';
import { SearchConnectorTab } from './search_connector_tab';
export function SettingsPage() {
  const {
    application: { navigateToApp },
    serverless,
    enterpriseSearch,
    setBreadcrumbs,
  } = useAppContext();

  const router = useObservabilityAIAssistantManagementRouter();

  const {
    query: { tab },
  } = useObservabilityAIAssistantManagementRouterParams('/');

  useEffect(() => {
    if (serverless) {
      serverless.setBreadcrumbs([
        {
          text: i18n.translate(
            'xpack.observabilityAiAssistantManagement.breadcrumb.serverless.observability',
            {
              defaultMessage: 'AI Assistant for Observability Settings',
            }
          ),
        },
      ]);
    } else {
      setBreadcrumbs([
        {
          text: i18n.translate('xpack.observabilityAiAssistantManagement.breadcrumb.index', {
            defaultMessage: 'AI Assistants',
          }),
          onClick: (e) => {
            e.preventDefault();
            navigateToApp('management', { path: '/kibana/aiAssistantManagementSelection' });
          },
        },
        {
          text: i18n.translate(
            'xpack.observabilityAiAssistantManagement.breadcrumb.observability',
            {
              defaultMessage: 'Observability',
            }
          ),
        },
      ]);
    }
  }, [navigateToApp, serverless, setBreadcrumbs]);

  const tabs: Array<{ id: TabsRt; name: string; content: JSX.Element; disabled?: boolean }> = [
    {
      id: 'settings',
      name: i18n.translate('xpack.observabilityAiAssistantManagement.settingsPage.settingsLabel', {
        defaultMessage: 'Settings',
      }),
      content: <SettingsTab />,
    },
    {
      id: 'knowledge_base',
      name: i18n.translate(
        'xpack.observabilityAiAssistantManagement.settingsPage.knowledgeBaseLabel',
        {
          defaultMessage: 'Knowledge base',
        }
      ),
      content: <KnowledgeBaseTab />,
    },
    {
      id: 'search_connector',
      name: i18n.translate(
        'xpack.observabilityAiAssistantManagement.settingsPage.searchConnector',
        {
          defaultMessage: 'Search Connectors',
        }
      ),
      content: <SearchConnectorTab />,
      disabled: enterpriseSearch == null,
    },
  ];

  const selectedTabId = tabs.some((t) => t.id === tab) ? tab : tabs[0].id;
  const selectedTabContent = tabs.find((obj) => obj.id === selectedTabId)?.content;

  const onSelectedTabChanged = (id: TabsRt) => {
    router.push('/', { path: '/', query: { tab: id } });
  };

  return (
    <>
      <EuiTitle size="l">
        <h2>
          {i18n.translate(
            'xpack.observabilityAiAssistantManagement.settingsPage.h2.settingsLabel',
            {
              defaultMessage: 'Settings',
            }
          )}
        </h2>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiTabs data-test-subj="settingsPageTabs">
        {tabs
          .filter((t) => !t.disabled)
          .map((t, index) => (
            <EuiTab
              key={index}
              data-test-subj={`settingsPageTab-${t.id}`}
              onClick={() => onSelectedTabChanged(t.id)}
              isSelected={t.id === selectedTabId}
            >
              {t.name}
            </EuiTab>
          ))}
      </EuiTabs>

      <EuiSpacer size="l" />

      {selectedTabContent}

      <EuiSpacer size="l" />
    </>
  );
}
