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
  EuiButtonEmpty,
  EuiCode,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLink,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { noop } from 'lodash';

import ctaImage from '../../assets/elastic_ai_assistant.png';
import { useKibana } from '../../hooks/use_kibana';
import type { UseKnowledgeBaseResult } from '../../hooks/use_knowledge_base';

export function WelcomeMessage({
  knowledgeBase,
  setup,
  onSetupConnectorClick,
}: {
  knowledgeBase: UseKnowledgeBaseResult;
  setup?: boolean;
  onSetupConnectorClick?: () => void;
}) {
  const { http } = useKibana().services;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const closePopover = () => setIsPopoverOpen(false);

  return (
    <EuiFlexGroup direction="column" justifyContent="spaceBetween" style={{ height: '100%' }}>
      <EuiFlexItem style={{ alignItems: 'center', justifyContent: 'center' }}>
        <EuiImage src={ctaImage} alt="Elastic AI Assistant" size="l" />

        <EuiSpacer size="m" />

        <EuiTitle css={{ textAlign: 'center', maxWidth: 500, alignSelf: 'center' }}>
          <h2>
            {i18n.translate('xpack.observabilityAiAssistant.disclaimer.title', {
              defaultMessage: 'Welcome to the Elastic AI Assistant for Observability',
            })}
          </h2>
        </EuiTitle>

        {setup && onSetupConnectorClick ? (
          <>
            <EuiSpacer size="m" />

            <EuiText color="subdued" size="s" style={{ maxWidth: 550, textAlign: 'center' }}>
              {i18n.translate(
                'xpack.observabilityAiAssistant.initialSetupPanel.setupConnector.description2',
                {
                  defaultMessage:
                    'Start working with the Elastic AI Assistant by setting up a connector for your AI provider. The OpenAI model needs to support function calls. We strongly recommend using GPT4.',
                }
              )}
              <EuiBetaBadge
                label=""
                css={{ boxShadow: 'none', inlineSize: 'unset', lineHeight: 'initial' }}
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

            <EuiSpacer size="m" />

            <div>
              <EuiButton
                data-test-subj="observabilityAiAssistantInitialSetupPanelSetUpGenerativeAiConnectorButton"
                fill
                color="primary"
                onClick={onSetupConnectorClick}
              >
                {i18n.translate(
                  'xpack.observabilityAiAssistant.initialSetupPanel.setupConnector.buttonLabel',
                  {
                    defaultMessage: 'Set up GenAI connector',
                  }
                )}
              </EuiButton>
            </div>
          </>
        ) : null}

        {knowledgeBase.isInstalling ? (
          <>
            <EuiSpacer size="m" />

            <EuiText color="subdued" size="s" style={{ maxWidth: 550, textAlign: 'center' }}>
              {i18n.translate(
                'xpack.observabilityAiAssistant.welcomeMessage.weAreSettingUpTextLabel',
                {
                  defaultMessage:
                    'We are setting up your knowledge base. This may take a few minutes. You can continue to use the Assistant while this process is underway.',
                }
              )}
            </EuiText>

            <EuiSpacer size="m" />

            <EuiButtonEmpty
              data-test-subj="observabilityAiAssistantWelcomeMessageSettingUpKnowledgeBaseButton"
              isLoading
              onClick={noop}
            >
              {i18n.translate(
                'xpack.observabilityAiAssistant.welcomeMessage.div.settingUpKnowledgeBaseLabel',
                { defaultMessage: 'Setting up Knowledge base' }
              )}
            </EuiButtonEmpty>
          </>
        ) : null}

        {!knowledgeBase.isInstalling &&
        (knowledgeBase.installError || !knowledgeBase.status.value?.ready) ? (
          <>
            <EuiSpacer size="m" />

            <EuiText color="subdued" size="s" style={{ maxWidth: 550, textAlign: 'center' }}>
              {i18n.translate(
                'xpack.observabilityAiAssistant.welcomeMessage.somethingWentWrongWhileInstallingKbLabel',
                { defaultMessage: 'Something went wrong while installing your Knowledge base.' }
              )}
            </EuiText>

            <EuiSpacer size="m" />

            <EuiButton
              color="primary"
              data-test-subj="observabilityAiAssistantWelcomeMessageSetUpKnowledgeBaseButton"
              fill
              iconType="refresh"
              onClick={knowledgeBase.install}
            >
              {i18n.translate('xpack.observabilityAiAssistant.welcomeMessage.retryButtonLabel', {
                defaultMessage: 'Retry install',
              })}
            </EuiButton>

            <EuiSpacer size="m" />

            <EuiPopover
              button={
                <EuiButtonEmpty
                  data-test-subj="observabilityAiAssistantWelcomeMessageInspectErrorsButton"
                  iconType="inspect"
                  onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                >
                  {i18n.translate(
                    'xpack.observabilityAiAssistant.welcomeMessage.inspectErrorsButtonEmptyLabel',
                    { defaultMessage: 'Inspect Errors' }
                  )}
                </EuiButtonEmpty>
              }
              isOpen={isPopoverOpen}
              closePopover={closePopover}
            >
              <EuiPanel color="subdued">
                <EuiDescriptionList>
                  <>
                    <EuiDescriptionListTitle>
                      {i18n.translate(
                        'xpack.observabilityAiAssistant.welcomeMessage.issuesDescriptionListTitleLabel',
                        { defaultMessage: 'Issues' }
                      )}
                    </EuiDescriptionListTitle>

                    <EuiDescriptionListDescription>
                      <ul>
                        {knowledgeBase.status.value?.deployment_state !== 'started' ? (
                          <li>
                            <FormattedMessage
                              id="xpack.observabilityAiAssistant.welcomeMessage.modelIsNotStartedLabel"
                              defaultMessage="{model} is not started"
                              values={{ model: <EuiCode>.elser_model_2</EuiCode> }}
                            />
                          </li>
                        ) : null}
                        {knowledgeBase.status.value?.allocation_state !== 'fully_allocated' ? (
                          <li>
                            <FormattedMessage
                              id="xpack.observabilityAiAssistant.welcomeMessage.modelIsNotFullyAllocatedLabel"
                              defaultMessage="{model} is not fully allocated"
                              values={{ model: <EuiCode>.elser_model_2</EuiCode> }}
                            />
                          </li>
                        ) : null}
                      </ul>
                    </EuiDescriptionListDescription>
                  </>
                </EuiDescriptionList>

                {knowledgeBase.status.value?.ready === false ? (
                  <div>
                    <EuiSpacer size="m" />

                    <FormattedMessage
                      id="xpack.observabilityAiAssistant.welcomeMessage.div.checkTrainedModelsToLabel"
                      defaultMessage="
                        Check {trainedModelsLink} to make sure {modelName} is deployed and running."
                      values={{
                        trainedModelsLink: (
                          <EuiLink
                            data-test-subj="observabilityAiAssistantWelcomeMessageTrainedModelsLink"
                            external
                            href={http.basePath.prepend('/app/ml/trained_models')}
                            target="_blank"
                          >
                            {i18n.translate(
                              'xpack.observabilityAiAssistant.welcomeMessage.trainedModelsLinkLabel',
                              { defaultMessage: 'Trained Models' }
                            )}
                          </EuiLink>
                        ),
                        modelName: <EuiCode>.elser_model_2</EuiCode>,
                      }}
                    />
                  </div>
                ) : null}
              </EuiPanel>
            </EuiPopover>
          </>
        ) : null}
      </EuiFlexItem>

      <EuiFlexItem grow style={{ justifyContent: 'end' }}>
        <EuiText color="subdued" size="xs" textAlign="center">
          {i18n.translate('xpack.observabilityAiAssistant.disclaimer.disclaimerLabel', {
            defaultMessage:
              "This chat is powered by an integration with your LLM provider. LLMs are known to sometimes present incorrect information as if it's correct, also called a hallucination. Elastic supports the configuration and connection to the LLM provider and to your knowledge base, but is not responsible for the LLM's responses.",
          })}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
