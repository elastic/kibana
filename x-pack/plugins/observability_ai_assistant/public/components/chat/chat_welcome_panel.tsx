/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiImage, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';
import ctaImage from '../../assets/elastic_ai_assistant.png';
import type { UseKnowledgeBaseResult } from '../../hooks/use_knowledge_base';

const incorrectLicenseContainer = css`
  height: 100%;
  padding: ${euiThemeVars.euiPanelPaddingModifiers.paddingMedium};
`;

export function ChatWelcomePanel({ knowledgeBase }: { knowledgeBase: UseKnowledgeBaseResult }) {
  return (
    <EuiPanel hasBorder={false} hasShadow={false}>
      <EuiFlexGroup
        direction="column"
        alignItems="center"
        justifyContent="center"
        className={incorrectLicenseContainer}
      >
        <EuiImage src={ctaImage} alt="Elastic AI Assistant" size="m" />
        <EuiTitle>
          <h2>
            {i18n.translate('xpack.observabilityAiAssistant.chatWelcomePanel.title', {
              defaultMessage: "Let's work on this together",
            })}
          </h2>
        </EuiTitle>
        <EuiText color="subdued" textAlign="center">
          <p>
            {knowledgeBase.status.value?.ready
              ? i18n.translate('xpack.observabilityAiAssistant.chatWelcomePanel.body.kbReady', {
                  defaultMessage:
                    'Keep in mind that Elastic AI Assistant is a technical preview feature. Please provide feedback at any time.',
                })
              : i18n.translate('xpack.observabilityAiAssistant.chatWelcomePanel.body.kbNotReady', {
                  defaultMessage:
                    'We recommend you enable the knowledge base for a better experience. It will provide the assistant with the ability to learn from your interaction with it. Keep in mind that Elastic AI Assistant is a technical preview feature. Please provide feedback at any time.',
                })}
          </p>
        </EuiText>

        {!knowledgeBase.status.value?.ready ? (
          <EuiButton
            data-test-subj="observabilityAiAssistantChatWelcomePanelSetUpKnowledgeBaseButton"
            color="primary"
            fill
            iconType={knowledgeBase.status.value?.ready ? 'checkInCircleFilled' : 'dotInCircle'}
            isLoading={knowledgeBase.isInstalling || knowledgeBase.status.loading}
            onClick={knowledgeBase.install}
          >
            {i18n.translate(
              'xpack.observabilityAiAssistant.chatWelcomePanel.knowledgeBase.buttonLabel.notInstalledYet',
              {
                defaultMessage: 'Set up knowledge base',
              }
            )}
          </EuiButton>
        ) : null}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
