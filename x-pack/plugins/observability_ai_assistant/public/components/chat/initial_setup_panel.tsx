/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBetaBadge,
  EuiButton,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { ConnectorSelectorBase } from '../connector_selector/connector_selector_base';
import { Disclaimer } from './disclaimer';
import { UseKnowledgeBaseResult } from '../../hooks/use_knowledge_base';
import { StartedFrom } from '../../utils/get_timeline_items_from_conversation';
import { useKibana } from '../../hooks/use_kibana';
import type { UseGenAIConnectorsResult } from '../../hooks/use_genai_connectors';

export function InitialSetupPanel({
  connectors,
  startedFrom,
}: {
  connectors: UseGenAIConnectorsResult;
  connectorsManagementHref: string;
  knowledgeBase: UseKnowledgeBaseResult;
  startedFrom?: StartedFrom;
}) {
  const [connectorFlyoutOpen, setConnectorFlyoutOpen] = useState(false);

  const {
    application: { navigateToApp, capabilities },
    triggersActionsUi: { getAddConnectorFlyout: ConnectorFlyout },
  } = useKibana().services;

  const handleConnectorClick = () => {
    if (capabilities.management?.insightsAndAlerting?.triggersActions) {
      setConnectorFlyoutOpen(true);
    } else {
      navigateToApp('management', {
        path: '/insightsAndAlerting/triggersActionsConnectors/connectors',
      });
    }
  };

  const onConnectorCreated = (createdConnector: ActionConnector) => {
    setConnectorFlyoutOpen(false);

    if (createdConnector.actionTypeId === '.gen-ai') {
      connectors.reloadConnectors();
    }
  };

  return (
    <>
      <Disclaimer />

      <EuiPanel paddingSize="m" style={{ overflowY: 'auto' }}>
        <EuiSpacer size="s" />

        <EuiText color="subdued" size="s">
          {i18n.translate('xpack.observabilityAiAssistant.initialSetupPanel.title', {
            defaultMessage: 'Start your Al experience with Elastic by completing the steps below.',
          })}
        </EuiText>

        <EuiSpacer size="l" />

        <EuiFlexGroup direction={startedFrom === 'conversationView' ? 'row' : 'column'}>
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon type="devToolsApp" size="xl" />}
              title={i18n.translate(
                'xpack.observabilityAiAssistant.initialSetupPanel.setupConnector.title',
                {
                  defaultMessage: 'Connector setup',
                }
              )}
              description={
                !connectors.connectors?.length ? (
                  <>
                    <EuiText size="s">
                      {i18n.translate(
                        'xpack.observabilityAiAssistant.initialSetupPanel.setupConnector.description1',
                        {
                          defaultMessage: 'Set up an OpenAI connector with your AI provider.',
                        }
                      )}
                    </EuiText>

                    <EuiText size="s">
                      {i18n.translate(
                        'xpack.observabilityAiAssistant.initialSetupPanel.setupConnector.description2',
                        {
                          defaultMessage:
                            'The OpenAI model needs to support function calls. We strongly recommend using GPT4.',
                        }
                      )}
                      <EuiBetaBadge
                        label=""
                        css={{ boxShadow: 'none' }}
                        tooltipContent={i18n.translate(
                          'xpack.observabilityAiAssistant.technicalPreviewBadgeDescription',
                          {
                            defaultMessage:
                              "GPT4 is required for a more consistent experience when using function calls (for example when performing root cause analysis, visualizing data and more). GPT3.5 can work for some of the simpler workflows, such as explaining errors or for a ChatGPT like experience within Kibana which don't require the use of frequent function calls.",
                          }
                        )}
                        iconType="iInCircle"
                        size="s"
                      />
                    </EuiText>
                  </>
                ) : connectors.connectors.length && !connectors.selectedConnector ? (
                  <EuiText size="s">
                    {i18n.translate(
                      'xpack.observabilityAiAssistant.initialSetupPanel.setupConnector.description',
                      {
                        defaultMessage: 'Please select a provider.',
                      }
                    )}
                  </EuiText>
                ) : undefined
              }
              footer={
                !connectors.connectors?.length ? (
                  <EuiButton
                    data-test-subj="observabilityAiAssistantInitialSetupPanelSetUpGenerativeAiConnectorButton"
                    fill
                    color="primary"
                    onClick={handleConnectorClick}
                  >
                    {i18n.translate(
                      'xpack.observabilityAiAssistant.initialSetupPanel.setupConnector.buttonLabel',
                      {
                        defaultMessage: 'Set up OpenAI connector',
                      }
                    )}
                  </EuiButton>
                ) : connectors.connectors.length && !connectors.selectedConnector ? (
                  <ConnectorSelectorBase {...connectors} />
                ) : null
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="xxl" />

        <EuiText color="subdued" size="s">
          {i18n.translate('xpack.observabilityAiAssistant.initialSetupPanel.disclaimer', {
            defaultMessage:
              'The AI provider that is configured may collect telemetry when using the Elastic AI Assistant. Contact your AI provider for information on how data is collected.',
          })}
        </EuiText>
      </EuiPanel>

      {connectorFlyoutOpen ? (
        <ConnectorFlyout
          onClose={() => setConnectorFlyoutOpen(false)}
          onConnectorCreated={onConnectorCreated}
        />
      ) : null}
    </>
  );
}
