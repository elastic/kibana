/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiPanel } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';
import { Disclaimer } from './disclaimer';
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
        <Disclaimer />

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
