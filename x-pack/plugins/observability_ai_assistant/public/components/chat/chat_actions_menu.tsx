/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonIcon,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { ConnectorSelectorBase } from '../connector_selector/connector_selector_base';
import type { UseGenAIConnectorsResult } from '../../hooks/use_genai_connectors';
import type { UseKnowledgeBaseResult } from '../../hooks/use_knowledge_base';
import type { StartedFrom } from '../../utils/get_timeline_items_from_conversation';

export function ChatActionsMenu({
  connectors,
  connectorsManagementHref,
  conversationId,
  disabled,
  knowledgeBase,
  modelsManagementHref,
  startedFrom,
  onCopyConversationClick,
}: {
  connectors: UseGenAIConnectorsResult;
  connectorsManagementHref: string;
  conversationId?: string;
  disabled: boolean;
  knowledgeBase: UseKnowledgeBaseResult;
  modelsManagementHref: string;
  startedFrom?: StartedFrom;
  onCopyConversationClick: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleActionsMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <EuiPopover
      isOpen={isOpen}
      button={
        <EuiButtonIcon
          data-test-subj="observabilityAiAssistantChatActionsMenuButtonIcon"
          disabled={disabled}
          iconType="boxesVertical"
          onClick={toggleActionsMenu}
          aria-label="Menu"
        />
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
                name: (
                  <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                    <EuiFlexItem grow>
                      {i18n.translate(
                        'xpack.observabilityAiAssistant.chatHeader.actions.knowledgeBase',
                        {
                          defaultMessage: 'Knowledge base',
                        }
                      )}
                    </EuiFlexItem>
                    <EuiFlexItem grow={false} style={{ paddingRight: 4 }}>
                      {knowledgeBase.status.loading || knowledgeBase.isInstalling ? (
                        <EuiLoadingSpinner size="s" />
                      ) : knowledgeBase.status.value?.ready ? (
                        <EuiIcon type="checkInCircleFilled" />
                      ) : (
                        <EuiIcon type="dotInCircle" />
                      )}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ),
                panel: 2,
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
                <EuiSpacer size="m" />
                <EuiButton
                  data-test-subj="observabilityAiAssistantChatActionsMenuManageConnectorsButton"
                  href={connectorsManagementHref}
                  iconSide="right"
                  iconType="arrowRight"
                  size="s"
                >
                  {i18n.translate(
                    'xpack.observabilityAiAssistant.chatHeader.actions.connectorManagement.button',
                    {
                      defaultMessage: 'Manage connectors',
                    }
                  )}
                </EuiButton>
              </EuiPanel>
            ),
          },
          {
            id: 2,
            width: 256,
            title: i18n.translate(
              'xpack.observabilityAiAssistant.chatHeader.actions.knowledgeBase.title',
              {
                defaultMessage: 'Knowledge base',
              }
            ),
            content: (
              <EuiPanel>
                <EuiText size="s">
                  {i18n.translate(
                    'xpack.observabilityAiAssistant.chatHeader.actions.knowledgeBase.description.paragraph',
                    {
                      defaultMessage:
                        'Using a knowledge base is optional but improves the experience of using the Assistant significantly.',
                    }
                  )}{' '}
                  <EuiLink
                    data-test-subj="observabilityAiAssistantChatActionsMenuLearnMoreLink"
                    external
                    target="_blank"
                    href="https://www.elastic.co/guide/en/machine-learning/current/ml-nlp-elser.html"
                  >
                    {i18n.translate(
                      'xpack.observabilityAiAssistant.chatHeader.actions.knowledgeBase.elser.learnMore',
                      {
                        defaultMessage: 'Learn more',
                      }
                    )}
                  </EuiLink>
                </EuiText>

                <EuiSpacer size="l" />
                {knowledgeBase.isInstalling || knowledgeBase.status.loading ? (
                  <EuiLoadingSpinner size="m" />
                ) : (
                  <>
                    <EuiSwitch
                      label={
                        knowledgeBase.isInstalling
                          ? i18n.translate(
                              'xpack.observabilityAiAssistant.chatHeader.actions.knowledgeBase.switchLabel.installing',
                              {
                                defaultMessage: 'Setting up knowledge base',
                              }
                            )
                          : i18n.translate(
                              'xpack.observabilityAiAssistant.chatHeader.actions.knowledgeBase.switchLabel.enable',
                              {
                                defaultMessage: 'Knowledge base installed',
                              }
                            )
                      }
                      checked={Boolean(knowledgeBase.status.value?.ready)}
                      disabled={
                        Boolean(knowledgeBase.status.value?.ready) || knowledgeBase.isInstalling
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          knowledgeBase.install();
                        }
                      }}
                    />

                    <EuiSpacer size="m" />

                    <EuiButton
                      data-test-subj="observabilityAiAssistantChatActionsMenuGoToMachineLearningButton"
                      fullWidth
                      href={modelsManagementHref}
                      size="s"
                    >
                      {i18n.translate(
                        'xpack.observabilityAiAssistant.chatHeader.actions.connectorManagement',
                        {
                          defaultMessage: 'Go to Machine Learning',
                        }
                      )}
                    </EuiButton>
                  </>
                )}
              </EuiPanel>
            ),
          },
        ]}
      />
    </EuiPopover>
  );
}
