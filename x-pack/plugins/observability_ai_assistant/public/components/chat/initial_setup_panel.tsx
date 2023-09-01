/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBetaBadge,
  EuiButton,
  EuiCallOut,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ConnectorSelectorBase } from '../connector_selector/connector_selector_base';
import type { UseGenAIConnectorsResult } from '../../hooks/use_genai_connectors';
import { ExperimentalFeatureBanner } from './experimental_feature_banner';
import { UseKnowledgeBaseResult } from '../../hooks/use_knowledge_base';
import { StartedFrom } from '../../utils/get_timeline_items_from_conversation';

export function InitialSetupPanel({
  connectors,
  connectorsManagementHref,
  knowledgeBase,
  startedFrom,
}: {
  connectors: UseGenAIConnectorsResult;
  connectorsManagementHref: string;
  knowledgeBase: UseKnowledgeBaseResult;
  startedFrom?: StartedFrom;
}) {
  return (
    <>
      <ExperimentalFeatureBanner />

      <EuiPanel paddingSize="m" style={{ overflowY: 'auto' }}>
        <EuiSpacer size="s" />

        <EuiText color="subdued" size="s">
          <p>
            {i18n.translate('xpack.observabilityAiAssistant.initialSetupPanel.title', {
              defaultMessage:
                'Start your Al experience with Elastic by completing the steps below.',
            })}
          </p>
        </EuiText>

        <EuiSpacer size="l" />

        <EuiFlexGroup direction={startedFrom === 'conversationView' ? 'row' : 'column'}>
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon type="machineLearningApp" size="xl" />}
              title={i18n.translate(
                'xpack.observabilityAiAssistant.initialSetupPanel.knowledgeBase.title',
                {
                  defaultMessage: 'Knowledge Base',
                }
              )}
              description={
                <EuiText size="s">
                  <p>
                    {i18n.translate(
                      'xpack.observabilityAiAssistant.initialSetupPanel.knowledgeBase.description.paragraph1',
                      {
                        defaultMessage:
                          'We recommend you enable the knowledge base for a better experience. It will provide the assistant with the ability to learn from your interaction with it.',
                      }
                    )}
                  </p>
                  <p>
                    {i18n.translate(
                      'xpack.observabilityAiAssistant.initialSetupPanel.knowledgeBase.description.paragraph2',
                      {
                        defaultMessage: 'This step is optional, you can always do it later.',
                      }
                    )}
                  </p>
                </EuiText>
              }
              footer={
                knowledgeBase.status.value?.ready ? (
                  <EuiCallOut
                    color="success"
                    iconType="checkInCircleFilled"
                    size="s"
                    style={{ padding: '10px 14px', display: 'inline-flex', borderRadius: '6px' }}
                    title={i18n.translate(
                      'xpack.observabilityAiAssistant.initialSetupPanel.knowledgeBase.buttonLabel.alreadyInstalled',
                      {
                        defaultMessage: 'Knowledge base installed',
                      }
                    )}
                  />
                ) : (
                  <EuiButton
                    color={knowledgeBase.status.value?.ready ? 'success' : 'primary'}
                    fill
                    isLoading={knowledgeBase.isInstalling || knowledgeBase.status.loading}
                    onClick={knowledgeBase.install}
                    iconType="dotInCircle"
                  >
                    {knowledgeBase.isInstalling || knowledgeBase.status.loading
                      ? i18n.translate(
                          'xpack.observabilityAiAssistant.initialSetupPanel.knowledgeBase.buttonLabel.installingKb',
                          {
                            defaultMessage: 'Installing knowledge base',
                          }
                        )
                      : i18n.translate(
                          'xpack.observabilityAiAssistant.initialSetupPanel.knowledgeBase.buttonLabel.kbNotInstalledYet',
                          {
                            defaultMessage: 'Set up knowledge base',
                          }
                        )}
                  </EuiButton>
                )
              }
            />
          </EuiFlexItem>

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
                  <EuiText size="s">
                    <p>
                      {i18n.translate(
                        'xpack.observabilityAiAssistant.initialSetupPanel.setupConnector.description1',
                        {
                          defaultMessage: 'Set up a Generative AI connector with your AI provider.',
                        }
                      )}
                    </p>

                    <p>
                      {i18n.translate(
                        'xpack.observabilityAiAssistant.initialSetupPanel.setupConnector.description2',
                        {
                          defaultMessage:
                            'The Generative AI model needs to support function calls. We strongly recommend using GPT4.',
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
                    </p>
                  </EuiText>
                ) : connectors.connectors.length && !connectors.selectedConnector ? (
                  <EuiText size="s">
                    <p>
                      {i18n.translate(
                        'xpack.observabilityAiAssistant.initialSetupPanel.setupConnector.description',
                        {
                          defaultMessage: 'Please select a provider.',
                        }
                      )}
                    </p>
                  </EuiText>
                ) : (
                  ''
                )
              }
              footer={
                !connectors.connectors?.length ? (
                  <EuiButton fill color="primary" href={connectorsManagementHref}>
                    {i18n.translate(
                      'xpack.observabilityAiAssistant.initialSetupPanel.setupConnector.buttonLabel',
                      {
                        defaultMessage: 'Set up Generative AI connector',
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
          <p>
            {i18n.translate('xpack.observabilityAiAssistant.initialSetupPanel.disclaimer', {
              defaultMessage:
                'The AI provider that is configured may collect telemetry when using the Elastic AI Assistant. Contact your AI provider for information on how data is collected.',
            })}
          </p>
        </EuiText>
      </EuiPanel>
    </>
  );
}
