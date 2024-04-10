/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenu,
  EuiPanel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { ConnectorSelectorBase } from '@kbn/observability-ai-assistant-plugin/public';
import { useKibana } from '../../hooks/use_kibana';
import { getSettingsHref } from '../../utils/get_settings_href';
import { getSettingsKnowledgeBaseHref } from '../../utils/get_settings_kb_href';
import type { UseGenAIConnectorsResult } from '../../hooks/use_genai_connectors';

export function ChatActionsMenu({
  connectors,
  conversationId,
  disabled,
  onCopyConversationClick,
}: {
  connectors: UseGenAIConnectorsResult;
  conversationId?: string;
  disabled: boolean;
  onCopyConversationClick: () => void;
}) {
  const {
    application: { navigateToUrl },
    http,
  } = useKibana().services;
  const [isOpen, setIsOpen] = useState(false);

  const toggleActionsMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleNavigateToSettings = () => {
    navigateToUrl(getSettingsHref(http));
  };

  const handleNavigateToSettingsKnowledgeBase = () => {
    navigateToUrl(getSettingsKnowledgeBaseHref(http));
  };

  return (
    <EuiPopover
      isOpen={isOpen}
      button={
        <EuiToolTip
          content={i18n.translate(
            'xpack.observabilityAiAssistant.chatActionsMenu.euiToolTip.moreActionsLabel',
            { defaultMessage: 'More actions' }
          )}
          display="block"
        >
          <EuiButtonIcon
            data-test-subj="observabilityAiAssistantChatActionsMenuButtonIcon"
            disabled={disabled}
            iconType="boxesVertical"
            onClick={toggleActionsMenu}
            aria-label={i18n.translate(
              'xpack.observabilityAiAssistant.chatActionsMenu.euiButtonIcon.menuLabel',
              { defaultMessage: 'Menu' }
            )}
          />
        </EuiToolTip>
      }
      panelPaddingSize="none"
      closePopover={toggleActionsMenu}
    >
      <EuiContextMenu
        initialPanelId={0}
        panels={[
          {
            id: 0,
            title: i18n.translate('xpack.observabilityAiAssistant.chatHeader.actions.title', {
              defaultMessage: 'Actions',
            }),
            items: [
              {
                name: i18n.translate(
                  'xpack.observabilityAiAssistant.chatHeader.actions.knowledgeBase',
                  {
                    defaultMessage: 'Manage knowledge base',
                  }
                ),
                onClick: () => {
                  toggleActionsMenu();
                  handleNavigateToSettingsKnowledgeBase();
                },
              },
              {
                name: i18n.translate('xpack.observabilityAiAssistant.chatHeader.actions.settings', {
                  defaultMessage: 'AI Assistant Settings',
                }),
                onClick: () => {
                  toggleActionsMenu();
                  handleNavigateToSettings();
                },
              },
              {
                name: (
                  <div className="eui-textTruncate">
                    {i18n.translate('xpack.observabilityAiAssistant.chatHeader.actions.connector', {
                      defaultMessage: 'Connector',
                    })}{' '}
                    <strong>
                      {
                        connectors.connectors?.find(({ id }) => id === connectors.selectedConnector)
                          ?.name
                      }
                    </strong>
                  </div>
                ),
                panel: 1,
              },
              {
                name: i18n.translate(
                  'xpack.observabilityAiAssistant.chatHeader.actions.copyConversation',
                  {
                    defaultMessage: 'Copy conversation',
                  }
                ),
                disabled: !conversationId,
                onClick: () => {
                  toggleActionsMenu();
                  onCopyConversationClick();
                },
              },
            ],
          },
          {
            id: 1,
            width: 256,
            title: i18n.translate('xpack.observabilityAiAssistant.chatHeader.actions.connector', {
              defaultMessage: 'Connector',
            }),
            content: (
              <EuiPanel>
                <ConnectorSelectorBase {...connectors} />

                <EuiButtonEmpty
                  flush="left"
                  size="s"
                  data-test-subj="settingsTabGoToConnectorsButton"
                  href={http.basePath.prepend(
                    `/app/management/insightsAndAlerting/triggersActionsConnectors/connectors`
                  )}
                >
                  {i18n.translate(
                    'xpack.observabilityAiAssistant.settingsPage.goToConnectorsButtonLabel',
                    { defaultMessage: 'Manage connectors' }
                  )}
                </EuiButtonEmpty>
              </EuiPanel>
            ),
          },
        ]}
      />
    </EuiPopover>
  );
}
